var url = require('url');

module.exports = ['$scope', 'editorAuth', '$location', '$timeout', 'editorModels', 'editorEvents',
function($scope, auth, $location, $timeout, models, events) {
	$scope.links = [
		{name: 'Discover', path: '/'},
		{name: 'Contribute', path: '/new'},
		{name: 'About', path: '/9dots/OIQQVMT'},
		{name: 'Partners', path: '/9dots/OIQRXqx'}
	];
	$scope.auth = auth;
	$scope.$on('$routeChangeSuccess', function(evt, current) {
    var parse = url.parse(window.location.href);
    //$scope.redirectUri = 'http://' + parse.host + '/login?redirect_uri=' + $location.path();
    $scope.redirectUri = $location.path();
    $('#main-nav-header').removeClass('transparent');
	});

	$scope.logout = function() {
		models.logout();
	  events.emit('logout');
	  $timeout(function() {
	    $location.path('/');
	  });
	}
	

}];