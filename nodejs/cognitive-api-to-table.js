const azure = require('azure-storage');
const request = require('request');
const _ = require('underscore');

// API configurations
const API_URL = '{Your API URL without parameters}';
const COGNITIVE_API_KEY = '{Your api key}';
const BUILD_ID = '{Your build id}';

// Item configurations
const NUMBER_OF_RESULTS = 5;
const MINIMAL_SCORE = 0;
const INCLUDE_METADATA = false;

const BLOB_NAME = '<Your blob name>';
const BLOB_ACCESS_KEY = '<Your blob access key>';
const BLOB_TABLE_NAME = '<Your blob table name>';

const tableService = azure.createTableService(BLOB_NAME, BLOB_ACCESS_KEY);
const entGen = azure.TableUtilities.entityGenerator;

function insertTableRow(partitionKey, rowKey, data) {
    return new Promise((fulfill, reject) => {
        const task = {
            PartitionKey: entGen.String(partitionKey),
            RowKey: entGen.String(rowKey),
            description: entGen.String(data),
            dueDate: entGen.DateTime(new Date(Date.UTC(2015, 11, 17))),
        };

        tableService.insertEntity(BLOB_TABLE_NAME, task, function (err, result, response) {
            if (err) {
                reject(err);
                return;
            }
            fulfill(result);
        });
    });
}

function requestCognitiveApi(items) {
    return new Promise((fulfill, reject) => {
        request({
            method: 'GET',
            url: API_URL,
            qs: {
                'buildId': BUILD_ID,
                'itemIds': items.join(','),
                'numberOfResults': NUMBER_OF_RESULTS,
                'includeMetadata': INCLUDE_METADATA,
                'minimalScore': MINIMAL_SCORE
            },
            headers: {
                'Ocp-Apim-Subscription-Key': COGNITIVE_API_KEY
            }
        }, (err, response, body) => {
            if (err) {
                reject(err);
                return;
            }

            fulfill(JSON.parse(body));
        });
    });
}

// Target items to get recommendations
const items = ['FKF-00829','C3T-00001']

requestCognitiveApi(items).then((result) => {
    let promise = Promise.resolve();

    if (result && result.recommendedItems) {
        _.each(result.recommendedItems, (data, i) => {
            _.each(data.items, (item, j) => {
                promise = promise.then(() => {
                    const partitionKey = JSON.stringify(items);
                    const rowKey = i + '-' + j;
                    const data = JSON.stringify(item);
                    return insertTableRow(partitionKey, rowKey, data);
                });
            });
        });
    }

    return promise;
}).then(() => {
    console.log('Completed');
});
