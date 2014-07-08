// Create Server and Express Application
var express = require('express')
  , app = module.exports = express()
  , _ = require('underscore')
  , browserChannel = require('browserchannel').server;

var chokidar = require('chokidar');

var level = require('level');
var live = require('level-live-stream')
var Sublevel = require('level-sublevel');

var db = Sublevel(level(__dirname + '/../../db', {createIfMissing: true}));
var pages = db.sublevel('pages');
var remotePages = db.sublevel('remotePages');
var unpubPages = db.sublevel('unpubPages');
var authors = db.sublevel('authors');
var TransformStream = require('stream').Transform;
var util = require('util');
var path = require('path');
var mkdirp = require('mkdirp');

var sep = '\xff';
var namespace = function() {
  var args = _.toArray(arguments);
  return args.join(sep);
};

var levelIgnore = /^p\//;
var leadingSlash = /^\//;

function toKey(p) {
  return p
    .replace(__dirname + '/out', '')
    .replace(path.extname(p), '')
    .replace(leadingSlash, '');
}

function matterKey(p) {
  return namespace('matter', toKey(p));
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

app.use('/markdown', require('./markdownStatic')(__dirname + '/out', success));

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

var timeouts = {};



function JSONStream(options) {
  TransformStream.call(this, options);
}

util.inherits(JSONStream, TransformStream);

JSONStream.prototype._transform = function(chunk, enc, next) {
  if (_.isString(chunk))
    this.push(JSON.parse(chunk));
  else 
    this.push(JSON.stringify(chunk));
  next();
}

function LiveStream(options) {
  TransformStream.call(this, options);
}

util.inherits(LiveStream, TransformStream);

LiveStream.prototype._transform = function(chunk, enc, next) {
  if (_.isObject(chunk))
    chunk.live = true;
  this.push(chunk);
  next();
}

// then expose `db` via shoe or any other streaming transport.
var shoe = require('shoe');
var shoeServer = app.listen(3001);

var pageSock = shoe(function (stream) {
  console.log('new stream');
  // stream old published pages
  live(pages, { min: "", max: sep , tail: false})
    .pipe(new JSONStream({objectMode: true}))
    .pipe(stream, {end: false});

  // stream live published pages
  live(pages, {min: "", max: sep, old: false})
    .pipe(new LiveStream({objectMode: true}))
    .pipe(new JSONStream({objectMode: true}))
    .pipe(stream);

  stream.on('end', function() {
    console.log('end');
  })
});
pageSock.install(shoeServer, '/pages');

var authorSock = shoe(function(stream) {
  live(authors, { min: "", max: sep})
    .pipe(new JSONStream({objectMode: true}))
    .pipe(stream);

  var instream = authors.createWriteStream();
  stream
    .pipe(new JSONStream({objectMode: true}))
    .pipe(instream);
});
authorSock.install(shoeServer, '/authors');


//TODO: cleanup live stream
var unpubPagesSock = shoe(function(stream) {
  stream.on('data', function(user) {
    // stream old unpublished pages
    live(unpubPages, {min: user + sep, max: user + sep + sep, tail: false})
      .pipe(new JSONStream({objectMode: true}))
      .pipe(stream, {end: false});

    // stream live unpublished pages
    live(unpubPages, {min: user + sep, max: user + sep + sep, old: false})
      .pipe(new LiveStream({objectMode: true}))
      .pipe(new JSONStream({objectMode: true}))
      .pipe(stream, {end: false});

  });
});
unpubPagesSock.install(shoeServer, '/unpubPages');

var renderSock = shoe(function(stream) {
  stream.on('data', function(data) {
    data = JSON.parse(data);
    var outPath = userOutPath(data.owner, data.file);
    renderContent(outPath, data.content);
  });
});
renderSock.install(shoeServer, '/render');

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
  return metadata.title && metadata.image && metadata.blurb && metadata.published;
}


function userOutPath(user, file) {
  if (user === '9dots')
    return (__dirname + '/out/p/' + file).replace(/\.md$/, '.html');
  else
    return (__dirname + '/out/u/' + user + '/' + file).replace(/\.md$/, '.html');
}

var https = require('https');
function githubToHtml(user, repo, file) {
  var p = '/' + user + '/' + repo + '/master/' + file;
  var outPath = userOutPath(user, file);
  var req = https.get("https://raw.github.com" + p, function(res) {
    var buffer = [];
    res.on('data', function(chunk) {
      buffer.push(chunk);
    });
    res.on('end', function() {
      renderContent(outPath, Buffer.concat(buffer));
    });
  });

  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });

}

function toHtml(srcPath) {
  if (minimatch(srcPath, ignore))
    return;
  var outPath = srcPath.replace(/src/g, 'out/p').replace(/\.md$/, '.html');
  fs.readFile(srcPath, function(err, data) {
    if (err) return;
    data.
    renderContent(outPath, data);
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

remotePages.createReadStream()
  .on('data', function(data) {
    var split = data.key.split(sep);
    var user = split[0];
    var repo = split[1];
    var file = split[2];
    githubToHtml(user, repo, file);
  });




