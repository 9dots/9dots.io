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

var imageExtensions = {'.jpeg': true, '.jpg': true, '.gif': true, '.png': true};
function isImage(ext) {
  console.log('isImage', ext);
  if (ext in imageExtensions)
    return true;
}

app.post('/upload', function(req, res) {
  var p = req.files.file.path;
  var ext = path.extname(req.files.file.name);
  var outname = short(++count)
  var out = path.join(uploadDir, outname);
  if (isImage(ext)) {
    console.log('image')
    thumbify(p, out, config, function(err) {
      if (err)
        throw err;
      console.log('res', outname);
      res.send({name: outname + '_md.jpg'});
    });
  } else {
    var outWithExt = out + ext;
    fs.createReadStream(p).pipe(fs.createWriteStream(outWithExt));
    res.send({name: outname + ext});
  }
  
});

app.use('/upload', function(req, res) {
  res.send('Upload not found.', 404);
});
  

var fs = require('fs'),
  path = require('path'),
  mime = require('mime')
  gm = require('gm'),
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
        console.log('write callback');
        cb(err, stdout);
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