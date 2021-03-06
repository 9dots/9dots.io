/**
 * Module dependencies.
 */

var Builder = require('component-builder')
  , templates = require('./templates')
  , rework = require('./rework')
  , fs = require('fs')
  , write = fs.writeFileSync
  , read = fs.readFileSync
  , Step = require('step')
  , bower = require('bower')
  , lodash = require('lodash')
  , path = require('path');

var uglify = require("uglify-js");
var cleanCSS = require('clean-css');


/**
 * Component builder middleware.
 */

function build(cb) {
  Step(
    function() {
      buildComponent(this.parallel());
      buildBower(this.parallel());
    },
    function(err) {
      if (err) throw err;
      cb && cb();
    }
  );
};

function minify() {
  ['public/app.js', 'public/bower.js'].forEach(function(file) {
    var result = uglify.minify(file);
    fs.writeFileSync(file, result.code);
  });
  ['public/app.css', 'public/bower.css'].forEach(function(file) {
    var minimized = cleanCSS.process(fs.readFileSync(file).toString());
    fs.writeFileSync(file, minimized);
  });
}

module.exports = function(req, res, next){
  if (process.env.NODE_ENV !== 'production') {
    build(function() {
      next();
    });
  } else {
    next();
  }
};

build(function() {
  minify();
});



function buildComponent(done) {
  var builder = new Builder('.');
  builder.addLookup('lib'); // TODO: shouldn't be necessary
  builder.addLookup('lib/editor/lib');
  builder.addSourceURLs();
  builder.copyAssetsTo('public');
  builder.use(rework);
  builder.use(templates);

  builder.build(function(err, res){
    if (err) return done(err);
    write('public/app.js', res.require + res.js);
    write('public/app.css', res.css);
    done();
  });
}


function buildBower(done) {

  // Merge task-specific and/or target-specific options with these defaults.
  var options = { separator: ';' };
  var paths = {
    '.js': 'public/bower.js',
    '.css': 'public/bower.css',
    '.png': 'public',
    '.gif': 'public'
  };

  bower.commands.list({paths: true}).
    on('end', function(data) {

      data.dependencies = lodash.chain(data)
        .values()
        .reverse()
        .flatten()
        .map(function(file) {
          return 'public/' + file;
        })
        .groupBy(function(file) {
          return path.extname(file);
        })
        .value();
      console.log('dep', data.dependencies);
      lodash.keys(data.dependencies).forEach(function(fileExt) {

        if (fileExt === '.js' || fileExt === '.css') {
          var src = data.dependencies[fileExt].map(function(filepath) {
            // Read file source.
            return read(filepath);
          }).join(options.separator);

          // Write the destination file.
          write(paths[fileExt], src);
        } else {
          data[fileExt].forEach(function(filepath) {
            var src = read(filepath);
            var filename = [paths[fileExt], path.basename(filepath)].join('/');
            write(filename, src);
          });
        }

        
      }); // lodash.keys
      done();
    })
    .on('error', function(err) {
      console.log('err', err);
    })

}