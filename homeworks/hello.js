// dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

// create an http server

var server = http.createServer(function(req,res){
  httpServer(req,res);
});

// start the http server

server.listen('3000', function(){
    console.log('Server is listening on port 3000');
});

// http server logic

var httpServer = function(req,res){
    // get and parse url
    var parsedUrl = url.parse(req.url,true);

    // parse path
    var path = parsedUrl.path;
    var trimmedPath = path.replace(/^\/+|\/+$/g,'');

    // get method
    var method = req.method.toLowerCase(); 

    // get query string as an object
    var queryStringObject = parsedUrl.query;

    // get headers as object
    var headers = req.headers;

    // get payload if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data',function(data){
        buffer += decoder.write(data);
    });
    req.on('end',function(){
        buffer += decoder.end();

        // choose the appropriate request handler. If not found, use notfound handler
        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notfound;

        var data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': buffer
        };

        // route request to handler specified in router
        chosenHandler(data,function(statusCode,payload){
            //use status code called back by handler or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode:200;
            //use payload called back by handler or return empty object
            payload = typeof(payload) == 'objec' ? payload:{};

            //convert payload to string
            var payloadString = JSON.stringify(payload);

            // return the response
            res.setHeader('Content-Type','application/json');
            res.writeHead(statusCode);
            res.end('Hello World\n',payloadString);

            console.log('returning this response',payload,queryStringObject,statusCode);

        });

    });
};

// request handlers
var handlers = {};

handlers.hello = function(data,callback){
    callback(200);
};

handlers.notfound = function(data,callback){
    callback(404);

};

// routers
var router = {
    'hello': handlers.hello
};
