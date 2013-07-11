// Create Server and Express Application
var express = require('express')
  , app = module.exports = express()
  , _ = require('underscore')
  , browserChannel = require('browserchannel').server;

// Add our Application Stuff
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(__dirname + '/out'));

var docpadInstance = require('docpad').createInstance({
  rootPath: __dirname,
  configPaths: [__dirname + '/docpad.js'],
  renderSingleExtensions: true
}, function(err){
    if (err)  return console.log(err.stack);
    // Tell DocPad to perform a generation, extend our server with its routes, and watch for changes
    docpadInstance.action('generate watch', function(err){
        if (err)  return console.log(err.stack);
    });
});

var database = docpadInstance.getDatabase();


var pages = database.findAllLive({relativeOutDirPath: 'pages'});


// socket requests
app.use(browserChannel(function(session) {
  console.log('session', session.id);
  session.on('message', function(message) {
    var data = JSON.parse(message);
    console.log('message', message);
    if (data.req === 'pages') {
      var modelsMeta = [];
      pages.forEach(function(model) {
        var doc = model.getMeta().toJSON();
        doc.relativeOutPath = model.get('relativeOutPath');
        modelsMeta.push(doc);
      });
      session.send(JSON.stringify({res: 'pages', body: modelsMeta}));
    }
  });
}));


