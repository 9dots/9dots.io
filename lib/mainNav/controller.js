var url = require('url');

module.exports = ['$scope', 'editorAuth', '$location',
function($scope, auth, $location) {
	$scope.links = [
		{name: 'Discover', path: '/'},
		{name: 'Contribute', path: '/new'},
		{name: 'About', path: '/menu/about'},
		{name: 'Partners', path: '/menu/partners'}
	];
	$scope.auth = auth;
	$scope.$on('$routeChangeSuccess', function(evt, current) {
    var parse = url.parse(window.location.href);
    $scope.redirectUri = 'http://' + parse.host + '/login?redirect_uri=' + $location.path();
	});

}];