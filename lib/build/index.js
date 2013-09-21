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

module.exports = function(req, res, next){
  
  if (process.env.NODE_ENV !== 'production') {
    build(next);
  } else {
    next();
  }
};

build();



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

  bower.commands.list({sources: true}).
    on('data', function(data) {
      lodash.keys(data).forEach(function(fileExt) {
        if (fileExt === '.js' || fileExt === '.css') {
          var src = data[fileExt].filter(function(filepath) {
          // Warn on and remove invalid source files (if nonull was set).
          if (!fs.existsSync(filepath)) {
            return false;
          } else {
            return true;
          }
          }).map(function(filepath) {
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
    });

}