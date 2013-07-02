module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-css');
  var gruntConfig = require('./grunt-config.json');
  grunt.initConfig(gruntConfig);
  grunt.registerTask('default', Object.keys(gruntConfig).join(' '));

  var bower = require('bower');
	var lodash = require('lodash');
  var path = require('path');
  var fs = require('fs');

  grunt.registerMultiTask('bowerBuilder', 'Build asset files from bower dependencies.', function() {
    var done = this.async();
    var self = this;

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      separator: ';'
    });

    bower.commands.list({sources: true}).
      on('data', function(data) {
        console.log(data);
        lodash.keys(data).forEach(function(fileExt) {
          console.log('fileExt', fileExt);
          if (fileExt === '.js' || fileExt === '.css') {
            var src = data[fileExt].filter(function(filepath) {
            // Warn on and remove invalid source files (if nonull was set).
            if (!grunt.file.exists(filepath)) {
              grunt.log.warn('Source file "' + filepath + '" not found.');
              return false;
            } else {
              return true;
            }
            }).map(function(filepath) {
              console.log('filepath', filepath);
              // Read file source.
              return grunt.file.read(filepath);
            }).join(grunt.util.normalizelf(options.separator));

            // Write the destination file.
            grunt.file.write(self.data[fileExt], src);

            // Print a success message.
            grunt.log.writeln('File "' + self.data[fileExt] + '" created.');
          } else {
            data[fileExt].forEach(function(filepath) {
              var src = fs.readFileSync(filepath);
              console.log("filename", filepath);
              var filename = [self.data[fileExt], path.basename(filepath)].join('/');
              fs.writeFileSync(filename, src);
              grunt.log.writeln('File "' + filename + '" created.');
            });
          }

          
        }); // lodash.keys

        done();
      });

  });
};