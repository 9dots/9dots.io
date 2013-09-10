
var app = angular.module('app');
app.run(['$templateCache', function($templateCache) {
  $templateCache.put('footer.html', require('./footer'));
}]);
