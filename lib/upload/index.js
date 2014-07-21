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
    'lrg': {
      ext: 'lrg',
      dims: [1800,1800]
    },
    'original': {
      quality: 90
    }
  }
};

console.log('config', config);

var imageExtensions = {'.jpeg': true, '.jpg': true, '.gif': true, '.png': true};
function isImage(ext) {
  if (ext.toLowerCase() in imageExtensions)
    return true;
}

/*var blur = require('./stack-blur');
var Canvas = require('canvas');
var Image = Canvas.Image;

function blurCanvas(imageSrc) {
  
  
  console.log('src', imageSrc);

  fs.readFile(imageSrc, function(err, data) {
    if (err) throw err;
    console.log('readfile', data);
    var canvas = new Canvas;
    var img = new Image();
    img.src = data;
    img.onerror = function(err) {
      throw err;
    }
    
    img.onload = function() {
      console.log('onload');
      var w = img.width;
      var h = img.height;
      canvas.width = w;
      canvas.height = h;
      console.log('width', w, h);
      var context = canvas.getContext("2d");
      context.drawImage(img, 0, 0, w, h);
      blur(canvas, 0, 0, w, h, w*0.08);
      canvas.JPEGStream().pipe(fs.createWriteStream(__dirname + '/blur.jpeg'));
    }
  })

  
  

}*/

app.post('/upload', function(req, res) {
  var p = req.files.file.path;
  
  var ext = path.extname(req.files.file.name);
  var outname = short(+ new Date())
  var out = path.join(uploadDir, outname);
  console.log('upload');
  if (isImage(ext)) {
    thumbify(p, out, config, function(err) {
      if (err)
        throw err;
      console.log('res', outname);
      res.send({name: outname + '_md.jpg', nameFull: outname + '_lrg.jpg'});
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

app.post('/blur', function(req, res) {
  var imgBase64 = req.body.imgBase64.replace(/^data:image\/jpeg;base64,/,"");
  var outname = req.body.name || (short(+ new Date()) + '.jpg');
  console.log('outname', outname);
  // pretty silly
  fs.writeFile(uploadDir + '/'+ outname, imgBase64, 'base64', function(err) {
    if (err)
        return res.send(err, 500);
    client.putFile(uploadDir + '/' + outname, outname, function(err, s3res) {
      if (err)
        return res.send(err, 500);
      else if (!err && s3res.statusCode === 200)
        res.send({name: outname});
    });
  });;
  
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

function blur(src, out, opts, cb) {
  console.log('blur fn', src, out, opts);
  var img = gm(src);
  img.size(function(err, size) {
    console.log('size', size.width, size.width * .2);
    img.quality(opts.quality)
    .type('Optimize')
    .setFormat('jpg')
    .blur(300)
    .write(out, function(err, stdout) {
      console.log('finish blur')
      if (err) cb(err);
      client.putFile(out, path.basename(out), function(err, res) {
        cb(err, stdout);
      });
    })
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