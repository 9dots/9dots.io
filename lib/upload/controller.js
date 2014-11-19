
var Upload = require('upload');

module.exports = ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
  var inputEl = $element.find('.fileUpload');
  var input = inputEl[0];
  var onend = $attrs.onend;

  inputEl.on('change', function() {
    var file = input.files[0]
  	var upload = new Upload(file);
  	upload.to('/upload');
    upload.on('progress', function(evt) {
      $scope.$apply(function() {
        $scope.progress = evt.percent;
      });
    });
  	upload.on('end', function(req) {
      $scope.name = file.name;

      var res = JSON.parse(req.response)
  		$scope.path = SETTINGS.config.uploads + '/' + res.name;
      $scope.pathFull = SETTINGS.config.uploads + '/' + res.nameFull;
  		$scope.$eval(onend);
  		$scope.$apply();
  	});
  })
}];