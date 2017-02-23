# HNN Porject azure-function
HNN Project - Azure Functions workflow scheduler repo

##Azure Function workflow
HNN 프로젝트의 activity log는 기존 legacy 환경인 AWS의 S3에 1시간 간격으로 적재됨. S3의 log를 1시간 간격(또는 주기적)으로 가져와 분석하기 위한 Azure 플랫폼으로 이전할 필요가 있음.  
Server-less 서비스 및 1시간 간격의 timer로 trigger를 하기위해 최선의 선택인 Azure Function을 Hackfest에 적용.  
특히, node.js는 물론 Python이나 C#, F#, PHP와 같은 언어부터, 쉘 명령 등을 제공하기 때문에 개발자는 아무 제약 없이 코드로 로직을 구현 가능  

##Azure Function Webhook - Javascript
node.js에서 timer를 이용함. timer trigger는 아래와 같은 예시 코드로 수행됨

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

timer object는 function.json에 위치하게 되고 아래와 같이 cron 형태로 정의되어 있음.  

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
cron 포맷을 이용하기 때문에 timer trgger를 이용해 S3의 blob을 Azure로 원하는 시각에 trigger 가능  

현 프로젝트 repo에서는 hackfest 개발의 편의를 위해 webhook 방식을 이용하고, Postman 등에서 webhook을 보내 function을 실행하도록 구성.  

node.js를 이용하는 web hook의 일반적인 형태  

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
webhook trigger를 이용해 S3 to Azure Blob을 node로 개발하고 테스트 하는 과정을 수행  

##AWS S3 package
AWS S3를 Azure Function에서 node로 접근하기 위한 패키지 및 기본 환경
[AWS S3 SDK 설치 및 tutorial](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-started-nodejs.html)

node에서 S3 package 구성을 위해 아래의 dependency가 필요
package.json 파일 참조
```
{
    "dependencies": {
        "aws-sdk": ">= 2.0.9",
        "node-uuid": ">= 1.4.1"
    }
}
```

Azure Function에서 node package를 추가하기 위해서는 Kudu의 comsole 환경을 이용해야 함.  
Azure Function Web UI에서 package.json 파일을 추가하거나 Kudu에서 추가하고 아래의 과정을 통해 "npm install" 명령 수행
[Node Version & Package Management](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#node-version--package-management)

Kudu console에서 aws-sdk package 등이 잘 구성되는 것을 확인

##Azure Storage Blob integration
S3로부터 파일을 받은 이후 해당 파일을 Azure의 Blob에 업로드 하는 과정 필요  

```
//코드 예제 추가

```

Azure의 Storage Blob의 "nodecontainer"에 S3로부터 받은 blob을 업로드 하는 코드이며 node에서 Azure Blob Stroage를 핸들하는 예제는 [HNN 프로젝트 - Azure Content repo](https://github.com/hnn-project/azure-content/tree/master/demo/storage-demo) 에서 확인 가능  
