
var Upload = require('upload');
var url = '/upload';

module.exports = ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
  var inputEl = $element.find('.fileUpload');
  var input = inputEl[0];
  var onend = $attrs.onend;

  inputEl.on('change', function() {
    var file = input.files[0]
  	var upload = new Upload(file);
  	upload.to(url);
  	upload.on('end', function(req) {
      $scope.name = file.name;
  		$scope.path = '/upload/' + JSON.parse(req.response).name;
  		$scope.$eval(onend);
  		$scope.$apply();
  		console.log('path', $scope.path, $scope.name);
  	});
  })
}];