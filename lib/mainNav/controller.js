var url = require('url');

module.exports = ['$scope', 'editorAuth', '$location', '$timeout', 'editorModels', 'editorEvents',
function($scope, auth, $location, $timeout, models, events) {
	$scope.links = [
		{name: 'Discover', path: '/'},
		{name: 'Contribute', path: '/new'},
		{name: 'About', path: '/p/about'},
		{name: 'Partners', path: '/p/partners'}
	];
	$scope.auth = auth;
	$scope.$on('$routeChangeSuccess', function(evt, current) {
    var parse = url.parse(window.location.href);
    //$scope.redirectUri = 'http://' + parse.host + '/login?redirect_uri=' + $location.path();
    $scope.redirectUri = $location.path();
	});

	$scope.logout = function() {
		models.logout();
	  events.emit('logout');
	  $timeout(function() {
	    $location.path('/');
	  });
	}
	

}];