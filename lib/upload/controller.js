
var Upload = require('upload');
var url = '/upload';

module.exports = ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
  var inputEl = $element.find('.fileUpload');
  var input = inputEl[0];
  var onend = $attrs.onend;

  inputEl.on('change', function() {
  	var upload = new Upload(input.files[0]);
  	upload.to(url);
  	upload.on('end', function(req) {
  		$scope.path = '/upload/' + JSON.parse(req.response).name + '_md.jpg';
  		$scope.$eval(onend);
  		$scope.$apply();
  		console.log('path', $scope.path);
  	});
  })
}];