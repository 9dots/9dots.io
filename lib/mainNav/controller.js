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

	$scope.seo = {};
	$scope.seo.title = function() {
		var id = [$routeParams.owner, $routeParams.name].join('-');
		var page = _.pick($scope.$pages, id);
    	if (_.isEmpty(page) || !page[id]) return 'Discover';
    	var type;
    	switch (page[id].type){
    		case 'lesson':
    			type = 'Lesson Plan'
    			break;
    		case 'unit':
    			type = 'Unit'
    			break;
    		case 'wiki':
    			type = 'Wiki'
    			break;
    		default:
    			type = ''
    			break;
    	}
    	return page[id].title + ' | ' + (page[id].type === 'lesson' ? 'Lesson Plan' : 'Unit');
    };

    $scope.seo.description = function() {
    	var id = [$routeParams.owner, $routeParams.name].join('-');
		var page = _.pick($scope.$pages, id);
    	if (_.isEmpty(page) || !page[id]) return '9 Dots is commited to providing free exploration driven STEM project curricula.';
    	return page[id].blurb;
    };



	$scope.$on('$routeChangeSuccess', function(evt, current) {
    	$scope.redirectUri = $location.path();
	});

	$scope.showMail = function($event){
		$scope.mail = true;
	}

	$scope.hideMail = function(){
		$scope.mail = false;
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