// Create Server and Express Application
var express = require('express')
  , app = module.exports = express()
  , _ = require('underscore')
  , browserChannel = require('browserchannel').server;

var chokidar = require('chokidar');

var level = require('level');
var live = require('level-live-stream')
var Sublevel = require('level-sublevel');
var db = Sublevel(level('/var/db/level/9dots.io', {createIfMissing: true}));
pages = db.sublevel('pages');
var TransformStream = require('stream').Transform;
var util = require('util');
var path = require('path');
var mkdirp = require('mkdirp');


var sep = '\xff';
var namespace = function(namespace, key) {
  return namespace + sep + key;
};

var levelIgnore = /^(menu\/|404)/;
var leadingSlash = /^\//;

function toKey(p) {
  p = p
    .replace(__dirname + '/out', '')
    .replace(path.extname(p), '')
    .replace(leadingSlash, '');
  if (!p.match(levelIgnore))
    return p;
}

function success(path) {
  var key = toKey(path);
  if (!key)
    return;
  key = namespace('views', key);
  pages.get(key, function(err, val) {
    if (err) val = 0;
    pages.put(key, ++val);
  });
}

app.use(require('./markdownStatic')(__dirname + '/out', success));


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
  var livestream = live(pages, { min: "", max: "\xff" });
  livestream
    .pipe(new JSONStream({objectMode: true}))
    .pipe(stream);
});
sock.install(app.listen(3001), '/pages');

var dir = __dirname + '/src/';
var fs = require('fs');
var chokidar = require('chokidar');
var jsyaml = require('js-yaml');
var marked = require('marked');
var minimatch = require('minimatch');
var render = require('./render');
var path = require('path');

var ignore = '**/.*';

function validCheck(metadata) {
  return metadata.title && metadata.image && metadata.blurb;
}


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

    var outPath = srcPath.replace(/src/g, 'out').replace(/\.md$/, '.html');
    render(metadata, function(err, string) {
      if (err) 
        return console.log('ERROR rendering file:', srcPath, err);

      mkdirp(path.dirname(outPath), function(err) {
        if (err)
          return console.log('ERROR writting file:', outPath);

        fs.writeFile(outPath, string, function(err) {
          if (err)
            return console.log('ERROR writing file:', outPath);
          delete metadata.content;
          var key = toKey(outPath);
          if (key) {
            key = namespace('matter', key);
            if (validCheck(metadata)) {
              pages.put(key, JSON.stringify(metadata));
            } else
              pages.del(key);
          }
        });

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



