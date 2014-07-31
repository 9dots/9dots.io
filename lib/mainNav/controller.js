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
    console.log($location.path);
    $scope.seo = {
    	title:'9 Dots STEM Curriculum',
    	description:'9 Dots is commited to providing free exploration driven STEM project curricula.'
	};
	console.log($scope.seo);
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