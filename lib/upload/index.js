var path = require('path');
var express = require('express');
var app = module.exports = express();
var _ = require('underscore');
var fs = require('fs');
var knox = require('knox');

var client = knox.createClient({
    key: 'AKIAJBZSOLCLYZHNTUYA'
  , secret: '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'
  , bucket: 'uploads.9dots.io'
});


var uploadDir = __dirname + '/public';

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

var imageExtensions = {'.jpeg': true, '.jpg': true, '.gif': true};
function isImage(ext) {
  if (ext.toLowerCase() in imageExtensions)
    return true;
}

app.post('/upload', function(req, res) {
  var p = req.files.file.path;
  var ext = path.extname(req.files.file.name);
  var outname = short(+ new Date())
  var out = path.join(uploadDir, outname);
  console.log('upload');
  if (isImage(ext)) {
    console.log('image', path);
    thumbify(p, out, config, function(err) {
      if (err)
        throw err;
      console.log('res', outname);
      res.send({name: outname + '_md.jpg'});
    });
  } else {
    var outWithExt = out + ext;
    // send to s3
    client.putFile(p, outname + ext, function(err, s3res) {
      if (!err && s3res.statusCode === 200)
        res.send({name: outname + ext});
    });
    
  }
  
});

app.use('/upload', function(req, res) {
  res.send('Upload not found.', 404);
});
  

var fs = require('fs'),
  path = require('path'),
  mime = require('mime')
  gm = require('gm'),
  gm = gm.subClass({ imageMagick: true })
  async = require('async');


function thumbify(src, outBase, opts, cb) {
  var types = _.map(opts.types, _.identity);
  async.map(types, function(type, cb) {
    console.log('type', type);
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
        if (err) cb (err);
        // send to s3
        client.putFile(out, path.basename(out), function(err, res) {
          cb(err, stdout);
        });
      }
    );
  }, function(err, stdouts) {
    console.log('final callback')
    cb(err, stdouts);
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