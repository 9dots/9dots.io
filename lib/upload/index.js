var path = require('path');
var express = require('express');
var app = module.exports = express();
var _ = require('underscore');
var fs = require('fs');


var uploadDir = __dirname + '/public';
var count = fs.readdirSync(uploadDir).length;

app.use(express.bodyParser({ keepExtensions: true, uploadDir: uploadDir }));

app.use('/upload', express.static(__dirname + '/public'));

var config = {
  quality: 75,  // global, overriden by local settings
  format: 'jpg',
  types: {
    'sm': {
      ext: 'sm',
      dims: [220, 220]
    },
    'md': {
      ext: 'md',
      dims: [360, 360]
    },
    'original': {
      quality: 90
    }
  }
};

app.post('/upload', function(req, res) {
  var p = req.files.file.path;
  var outname = short(count++)
  console.log('outname', outname);
  var out = path.join(uploadDir, outname);
  thumbify(p, out, config, function(err) {
    if (err)
      throw err;
    res.send({name: outname});
  })
});
  

var fs = require('fs'),
  path = require('path'),
  mime = require('mime')
  gm = require('gm');


function thumbify(src, outBase, opts, cb) {
  _.each(opts.types, function(type) {
    var img = gm(src);
    var format = type.format || opts.format;

    type.dims && img.resize(type.dims[0], type.dims[1]);
    type.profile || img.noProfile();

    var out = outBase;
    if(type.ext) out += '_'+type.ext;
    out += '.' + opts.format;
    img.quality(type.quality || opts.quality)
      .type('Optimize')
      .setFormat(format)
      .write(out,function(err, stdout) {
        cb && cb(err, stdout, type.ext);
      }
    );
  });
}

function short(num) {
  var digits = [];
  var remainder;

  while (num > 0) {
    remainder = num % 62;
    digits.push(remainder);
    num = Math.floor(num / 62);

  }

  digits = digits.reverse();
  return _.chain(digits)
    .map(function(digit) {
      if (digit < 10) {
        return '' + digit;
      } else if (digit < 36) {
        return String.fromCharCode(digit + 55);
      } else {
        return String.fromCharCode(digit + 61);
      }
    })
    .join('').value();
}