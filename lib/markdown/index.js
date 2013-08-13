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
var pages = db.sublevel('pages');
var remotePages = db.sublevel('remotePages');
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
  p = p
    .replace(__dirname + '/out', '')
    .replace(path.extname(p), '')
    .replace(leadingSlash, '');
  if (!p.match(levelIgnore))
    return p;
}

function matterKey(p) {
  var key = toKey(p);
  if (key)
    key = namespace('matter', key);
  return key;
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
app.post('/webhook', function(req, res) {
  var filesChanged = {};
  var filesRemoved = {};
  var repo = req.body.repository;

  _.each(req.body.commits, function(commit) {
    _.each(commit.added.concat(commit.modified), function(file) {
      filesChanged[file] = true;
      filesRemoved[file] = false;
    });
    _.each(commit.removed, function(file) {
      filesChanged[file] = false;
      filesRemoved[file] = true;
    });
  });

  _.each(filesChanged, function(changed, file) {
    if (!changed)
      return;
    githubToHtml(repo.owner.name, repo.name, file);
    var nm = namespace(repo.owner.name, repo.name, file);
    console.log('nm', nm);
    remotePages.put(nm, + new Date());
  });

  _.each(filesRemoved, function(removed, file) {
    if (!removed)
      return;
    var outPath = userOutPath(repo.owner.name, file);
    var key = matterKey(outPath);
    if (key)
      pages.del(key);

    var nm = namespace(repo.owner.name, repo.name, file);
    remotePages.del(nm)
  });

});


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

function renderContent(outPath, data) {
  console.log('render', outPath);
  var metadata = {};
  var content = data.toString().replace(/^(---\n)((.|\n)*?)\n---\n?/, function (match, dashes, frontmatter) {
    try {
      metadata = jsyaml.load(frontmatter);
    } catch(e) {
      console.log('ERROR encoding YAML');
    }
    return '';
  }).trim();

  var key = matterKey(outPath);
  metadata.content = content;

  function error(message) {
    if (key)
      pages.del(key);
    return console.log(message, outPath);
  }


  render(metadata, function(err, string) {
    if (err) 
      return error('ERROR rendering file:');

    mkdirp(path.dirname(outPath), function(err) {
      if (err)
        return error('ERROR writting file:');

      fs.writeFile(outPath, string, function(err) {
        if (err)
          return error('ERROR writing file:');
        delete metadata.content;
        
        if (key) {
          if (validCheck(metadata)) {
            pages.put(key, JSON.stringify(metadata));
          } else
            return error('ERROR invalid metadata:');
        }
      });

    });
  });
}

function userOutPath(user, file) {
  return (__dirname + '/out/u/' + user + '/' + file).replace(/\.md$/, '.html');
}

var https = require('https');
function githubToHtml(user, repo, file) {
  var p = '/' + user + '/' + repo + '/master/' + file;
  var outPath = userOutPath(user, file);
  var req = https.get("https://raw.github.com" + p, function(res) {
    var buffer = [];
    console.log('res', res.statusCode);
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



