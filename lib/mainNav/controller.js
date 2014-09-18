var url = require('url');

module.exports = ['$scope', 'editorAuth', '$location', '$timeout', 'editorModels', 'editorEvents', '$routeParams',
function($scope, auth, $location, $timeout, models, events, $routeParams) {
	$scope.links = [
		{name: 'Discover', path: '/'},
		{name: 'Contribute', path: '/new'},
		{name: 'About', path: '/9dots/OIQQVMT'},
		{name: 'Partners', path: '/9dots/OIQRXqx'}
	];
	$scope.auth = auth;
	$scope.seo = {
    	title:'Discover',
    	description:'9 Dots is commited to providing free exploration driven STEM project curricula.'
	};
	$scope.$on('$routeChangeSuccess', function(evt, current) {
    var parse = url.parse(window.location.href);
    var id = [$routeParams.owner, $routeParams.name].join('-');
	var page = _.pick($scope.$pages, id);
	if (! _.isEmpty(page) )
	{
		$scope.seo.title = page[id].title;
		$scope.seo.description = page[id].blurb;
	}
	else{
		$scope.seo = {
    		title:'Discover',
    		description:'9 Dots is commited to providing free exploration driven STEM project curricula.'
		};
	}
    //$scope.redirectUri = 'http://' + parse.host + '/login?redirect_uri=' + $location.path();
    $scope.redirectUri = $location.path();
	});



	$scope.showMail = function($event){
		console.log($scope);
		$scope.mail = true;
	}

	$scope.hideMail = function(){
		console.log($scope);
		$scope.mail = false;
		console.log($scope.mail);
	}

	$scope.logout = function() {
		models.logout();
	  events.emit('logout');
	  $timeout(function() {
	    $location.path('/');
	  });
	}

	$scope.window = window;
	$scope.routeParams = $routeParams;
	

}];