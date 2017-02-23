const azure = require('azure-storage');
const AWS = require('aws-sdk');
const fs = require('fs');
const stream = require('stream');

AWS.config.loadFromPath('./aws-config.json');

const S3_BUCKET_NAME = '<Your bucket name>';

const AZURE_BLOB_NAME = '<Your blob name>';
const AZURE_BLOB_ACCESS_KEY = '<Your azure blob access key>';
const AZURE_CONTAINER_NAME = '<Your container name>';

const s3 = new AWS.S3();
const blobService = azure.createBlobService(AZURE_BLOB_NAME, AZURE_BLOB_ACCESS_KEY);

// @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html
function listAwsS3Objects(bucketName, prefix) {
    return new Promise((fulfill, reject) => {
        const options = {
            Bucket: bucketName
        };

        if (prefix) {
            // Limits the response to keys that begin with the specified prefix.
            options.Prefix = prefix;
        }

        s3.listObjectsV2(options, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            fulfill(data.Contents);
        });
    });
}

function getAwsS3Object(bucketName, fileName) {
    return new Promise((fulfill, reject) => {
        s3.getObject({
            Bucket: bucketName,
            Key: fileName
        }, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            fulfill(data);
        });
    });
}

// @see http://azure.github.io/azure-storage-node/
function createAzureBlobWriteStream(containerName, blobName) {
    return blobService.createWriteStreamToBlockBlob(containerName, blobName);
}

// Upload files (which starts with 'test/') in S3 to azure storage
listAwsS3Objects(S3_BUCKET_NAME, 'test/').then((list) => {
    let promise = Promise.resolve();

    list.forEach((item) => {
        console.log(`Upload ${item.Key}`);

        promise = promise.then(() => {
            return getAwsS3Object(S3_BUCKET_NAME, item.Key).then((data) => {
                const rs = new stream.PassThrough();
                const ws = createAzureBlobWriteStream(AZURE_CONTAINER_NAME, item.Key);
                rs.end(data.Body);
                rs.pipe(ws);
            });
        });
    });

    return promise;
}).then(() => {
    console.log('Completed');
});