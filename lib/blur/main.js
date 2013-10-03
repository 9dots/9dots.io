var blur = require('./stack-blur');
var Upload = require('upload');

function blurImage(canvas, img, w, h) {
  canvas.style.width = w;
  canvas.style.height = h;
  canvas.width = w;
  canvas.height = h;
  var context = canvas.getContext("2d");
  context.drawImage(img, 0, 0, w, h);
  blur(canvas, 0, 0, w, h, w*0.08);
}

function blurCanvas(imageSrc, canvasEl, cb) {
	var img = new Image();
  img.crossOrigin = "anonymous";
	img.src = imageSrc;
  img.onload = function() {
  	var canvas = canvasEl[0];
    var w = 1200, h = 600;
    blurImage(canvas, img, w, h);
    cb(w, h);
    w = $(window).width();
    h = $(window).height();
    blurImage(canvas, img, w, h);
  };
}

function parseUrl( url ) {
  var a = document.createElement('a');
  a.href = url;
  return a;
}

function blurUrl(url) {
  var us = url.split('.');

  return us.slice(0, us.length-1).join('.') + '_blur.jpg';
}

function saveCanvas(imageSrc, canvasEl, w, h) {
  var canvas = canvasEl[0];
  var dataURL = canvas.toDataURL('image/jpeg');
  var name = _.last(parseUrl(imageSrc).pathname.split('/'));
  name = name.split('.')[0] + '_blur.jpg';
  console.log('name', name)
  $.ajax({
    type: "POST",
    url: "/blur",
    data: { 
       imgBase64: dataURL,
       name: name
    }
  }).done(function(o) {
    console.log('saved');
  });
}

module.exports = {
  directive: function() {
    return {
      controller: ['$scope', '$element', '$attrs', '$interpolate',
      function($scope, $element, $attrs, $interpolate) {
        $attrs.$observe('blur', function(imageSrc) {
          blurCanvas(imageSrc, $element, function(w, h) {
            var save = $scope.$eval($attrs.save);
            save && saveCanvas(imageSrc, $element, w, h);
          });
        });
      }]
    };
  },
  filter: function() {
    return function(url) {
      return blurUrl(url);
    }
    
  }
} 
