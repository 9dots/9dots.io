// Create Server and Express Application
var express = require('express')
  , app = module.exports = express()
  , _ = require('underscore')
  , browserChannel = require('browserchannel').server;

var chokidar = require('chokidar');

// Add our Application Stuff
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(__dirname + '/out'));

var level = require('level');
var livefeed = require('level-livefeed');
var db = level('/var/db/level/9dots.io', {createIfMissing: true});
var TransformStream = require('stream').Transform;
var util = require('util');

function JSONStream(options) {
  TransformStream.call(this, options);
}

util.inherits(JSONStream, TransformStream);

JSONStream.prototype._transform = function(chunk, enc, next) {
  this.push(JSON.stringify(chunk));
  next();
}

// then expose `db` via shoe or any other streaming transport.
var shoe = require('shoe');
var sock = shoe(function (stream) {
  var livestream = livefeed(db, { start: "pages:", end: "pages;" });
  livestream.pipe(new JSONStream({objectMode: true})).pipe(stream);
});
sock.install(app.listen(3001), '/pages');

var dir = __dirname + '/src/documents/';
var fs = require('fs');
var chokidar = require('chokidar');
var jsyaml = require('js-yaml');
var marked = require('marked');
var minimatch = require('minimatch');
var render = require('./render');
var path = require('path');

var ignore = '**/.*';


function toHtml(srcPath) {
  if (minimatch(srcPath, ignore))
    return;
  fs.readFile(srcPath, function(err, data) {
    if (err) return;
    var metadata = {};
    var content = data.toString().replace(/^(---\n)((.|\n)*?)\n---\n?/, function (match, dashes, frontmatter) {
      try {
        metadata = jsyaml.load(frontmatter);
      } catch(e) {
        console.log('ERROR encoding YAML');
      }
      return '';
    }).trim();
    metadata.content = content;

    var outPath = srcPath.replace(/src\/documents/g, 'out').replace(/\.md$/, '.html');
    render(metadata, function(err, string) {
      if (err) 
        return console.log('ERROR rendering file:', srcPath, err);
      fs.writeFile(outPath, string, function(err) {
        if (err)
          return console.log('ERROR writing file:', outPath);
        delete metadata.content;
        var key = path.basename(outPath, path.extname(outPath));
        db.put('pages:' + key, JSON.stringify(metadata));
      });
    })

  });
}
fs.readdir(dir, function(err, files) {
  _.each(files, function(file) {
    toHtml(file);
  });
});
var watcher = chokidar.watch(dir, {ignored: /^\./, persistent: true});
watcher.on('add', toHtml);
watcher.on('change', toHtml);



