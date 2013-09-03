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
app.post('/webhook', function(req, res) {
  var filesChanged = {};
  var filesRemoved = {};
  var repo = req.body.repository;

  console.log('req', req.body);

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

    if (timeouts[file])
      clearTimeout(timeouts[file]);
    // give github time to update
    timeouts[file] = setTimeout(function() {
      githubToHtml(repo.owner.name, repo.name, file);
      clearTimeout(timeouts[file]);
    }, 60000);
    
    var nm = namespace(repo.owner.name, repo.name, file);
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
  // stream old published pages
  live(pages, { min: "", max: sep , tail: false})
    .pipe(new JSONStream({objectMode: true}))
    .pipe(stream, {end: false});

  // stream live published pages
  live(pages, {min: "", max: sep, old: false})
    .pipe(new LiveStream({objectMode: true}))
    .pipe(new JSONStream({objectMode: true}))
    .pipe(stream);


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

var authorCatchRe = __dirname + '/out/u/([^\/]+?)/.*';
function defaultMeta(outpath, metadata) {
  var defaults = {
    layout: 'post',
    date: new Date(),
  };

  _.each(defaults, function(key, value) {
    if (! metadata[key])
      metadata[key] = value;
  });

  if (! metadata.author) {
    var match = outpath.match(authorCatchRe);
    var author = match && match[1];
    metadata.author = author;
  }

}

function renderContent(outPath, data) {
  console.log('renderContent', outPath, data.toString());
  var metadata = {};
  var content = data.toString().replace(/^(---\n)((.|\n)*?)\n---\n?/, function (match, dashes, frontmatter) {
    try {
      metadata = jsyaml.load(frontmatter);
    } catch(e) {
      console.log('ERROR encoding YAML');
    }
    return '';
  }).trim();

  defaultMeta(outPath, metadata);

  var key = toKey(outPath);
  var pagesKey, unpubKey;
  if (metadata.author) {
    pagesKey = namespace('matter', key);
    unpubKey = namespace(metadata.author, key);
  }
  
  metadata.content = content;

  function error(message) {
    if (metadata.author) {
      pages.del(pagesKey);
      unpubPages.del(unpubKey);
    }
      
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
        
        if (metadata.author) {
          var strMeta = JSON.stringify(metadata);

          if (validCheck(metadata)) {
            unpubPages.del(unpubKey);
            pages.put(pagesKey, strMeta);
            
          } else {
            pages.del(pagesKey);
            unpubPages.put(unpubKey, strMeta);
            
          }

        }
      });

    });
  });
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

remotePages.createReadStream()
  .on('data', function(data) {
    var split = data.key.split(sep);
    var user = split[0];
    var repo = split[1];
    var file = split[2];
    githubToHtml(user, repo, file);
  });




