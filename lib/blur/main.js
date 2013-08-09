var blur = require('./stack-blur');

function blurCanvas(imageSrc, canvasEl) {
	var img = new Image();
	img.src = imageSrc;
  img.onload = function() {
  	var canvas = canvasEl[0];
  	var w = $(window).width();
  	var h = $(window).height();
  	canvas.style.width = w;
  	canvas.style.height = h;
  	canvas.width = w;
  	canvas.height = h;
  	var context = canvas.getContext("2d");
    context.drawImage(img, 0, 0, w, h);
    blur(canvas, 0, 0, w, h, w*0.08);
  };
}

module.exports =function() {
	return {
		controller: ['$scope', '$element', '$attrs', '$interpolate',
		function($scope, $element, $attrs, $interpolate) {
			$attrs.$observe('blur', function(imageSrc) {
				blurCanvas(imageSrc, $element);
			});
		}]
	};
};
