const mysql = require('mysql');
const azure = require('azure-storage');
const _ = require('underscore');
const readline = require('readline');

const AZURE_BLOB_NAME = '<Your blob Name>';
const AZURE_BLOB_ACCESS_KEY = '<Your blob access key>';
const AZURE_CONTAINER_NAME = '<Your container name>';

const DB_HOST = '<Your DB host>';
const DB_USERNAME = '<Your DB username>';
const DB_PASSWORD = '<Your DB password>';
const DB_DATABASE = '<Your DB database>';
const TABLE_NAME = '<Your table name>';

const blobService = azure.createBlobService(AZURE_BLOB_NAME, AZURE_BLOB_ACCESS_KEY);

/**
 * Insert rows with json format to MySQL
 * 
 * @example
 * - data format example
 *      {"id": 1, "name": "Sam"}
 *      {"id": 2, "name": "Steve"}
 *      {"id": 3, "name": "David"}
 *      {"id": 4, "name": "Asher"}
 *      {"id": 5, "name": "Juline"}
 */
function insertLines(connection, data) {
    return new Promise((fulfill, reject) => {
        connection.query(`INSERT INTO ${TABLE_NAME} VALUES ` + makeInsertQuery(data), function (err, result) {
            if (err) {
                reject(err);
                return;
            }
            fulfill(result);
        });
    });
}

function makeInsertQuery(data) {
    var keys = _.keys(data[0]);

    return '(' + keys.join(',') + ') VALUES (' + _.map(data, function (row) {
        return _.map(keys, function (key) {
            return mysql.escape(row[key]);
        }).join(',');
    }).join('),(') + ')';
}

const connection = mysql.createConnection({
    host: DB_HOST,
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE
});

connection.connect();

// @see http://azure.github.io/azure-storage-node
const rs = blobService.createReadStream(AZURE_CONTAINER_NAME, 'example/data/data.txt');

const rl = readline.createInterface({
    input: rs
});

let promise = Promise.resolve();
let buffers = [];
const BUFFER_SIZE = 1000;

rl.on('line', (line) => {
    const item = JSON.parse(line);

    if (buffers.length < BUFFER_SIZE) {
        buffers.push(item);
    }

    // Insert rows in buffer units
    if (buffers.length === BUFFER_SIZE) {
        const list = buffers.concat();
        promise = promise.then(() => {
            return insertLines(connection, list);
        });

        buffers = [];
    }
});

rl.on('close', () => {
    // Insert remains
    if (buffers.length) {
        promise = promise.then(() => {
            return insertLines(connection, buffers);
        });
    }

    promise = promise.then(() => {
        connection.end();
        console.log('Completed');
    });
});
