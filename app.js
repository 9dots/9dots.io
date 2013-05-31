// Create Server and Express Application
var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app).listen(3000);

// Add our Application Stuff
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

// Add DocPad to our Application
var docpadInstanceConfiguration = {
    // Give it our express application and http server
    serverExpress: app,
    serverHttp: server,
    // Tell it not to load the standard middlewares (as we handled that above)
    middlewareStandard: false,
    port: 3001
};
var docpadInstance = require('docpad').createInstance(docpadInstanceConfiguration, function(err){
    if (err)  return console.log(err.stack);
    // Tell DocPad to perform a generation, extend our server with its routes, and watch for changes
    docpad.action('generate server watch', function(err){
        if (err)  return console.log(err.stack);
    });
});
