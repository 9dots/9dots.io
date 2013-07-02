// Create Server and Express Application
var express = require('express')
  , http = require('http')
  , app = express()
  , server = http.createServer(app)
  , io = require('engine.io').attach(server)
  , _ = require('underscore');

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

var database = docpadInstance.getDatabase();


var pages = database.findAllLive({relativeOutDirPath: 'pages'});

io.on('connection', function(socket){
  socket.on('message', function(message) {
    var data = JSON.parse(message);
    console.log('message', message);
    if (data.req === 'pages') {
      var modelsMeta = [];
      pages.forEach(function(model) {
        var doc = model.getMeta().toJSON();
        doc.relativeOutPath = model.get('relativeOutPath');
        modelsMeta.push(doc);
      });
      socket.send(JSON.stringify({res: 'pages', body: modelsMeta}));
    }
  });
});




// start server
server.listen(3000);