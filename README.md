# HNN Project azure-function
HNN Project - Azure Functions workflow scheduler repo

##Azure Functions benefit in HNN project
The activity log of the HNN project is loaded into S3 of AWS, every one-hour intervals. S3 logs need to be migrated to the Azure platform for one-hour intervals (or periodic) for analysis. Apply Azure function to Hackfest, which is the best option to trigger with server-less service and 1-hour timer.  
Especially, since node.js, Python, C#, F#, PHP such like popular developer languages and shell commands are provided, the developer can implement the logic in code without restriction.  

##Azure Function Webhook - node.js
Using a timer in node.js. The timer trigger is executed with the following example code  

```
module.exports = function (context, myTimer) {
    var timeStamp = new Date().toISOString();
    
    if(myTimer.isPastDue)
    {
        context.log('JavaScript is running late!');
    }
    context.log('JavaScript timer trigger function ran!', timeStamp);   
    
    context.done();
};
```

The Azure function app provides a cron style timer and stores it in function.json in the form:  

```
{
  "bindings": [
    {
      "name": "myTimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 */5 * * * *"
    }
  ],
  "disabled": false
}
```

Because it uses cron format, hackfest team can trigger S3 blob to Azure at desired time using timer trgger.  
In current project repository, webhook method is used for hackfest development, and assume that webhook is sent by Postman to execute function.  

Common forms of web hooks using node.js  
```
module.exports = function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (req.query.name || (req.body && req.body.name)) {
        res = {
            // status: 200, /* Defaults to 200 */
            body: "Hello " + (req.query.name || req.body.name)
        };
    }
    else {
        res = {
            status: 400,
            body: "Please pass a name on the query string or in the request body"
        };
    }
    context.done(null, res);
};
```

Hogangnono develops and operates services using node.js. To configure an additional node package to use S3 in AWS, which is not included bu default in Azure Function, add it in "Kudu" console and configure it by executing "npm install" command as below.  

package.json file  


```
{
    "dependencies": {
        "aws-sdk": ">= 2.0.9",
        "node-uuid": ">= 1.4.1"
    }
}
```

[Azure Functions - Node Version & Package Management](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#node-version--package-management)  

##S3 to Azure Storage Blob integration code - node.js
[S3 to Azure Storage Blob integration code - node.js code location](https://github.com/hnn-project/azure-function/tree/master/nodejs)

```
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
```

You can transfer blobs from AWS S3 blob to Azure Blob Storage.  
 