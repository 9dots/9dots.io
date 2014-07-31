var npm = require('npm');
var Emitter = require('emitter');

pages = new Emitter();

var unpublished = {};
module.exports = {
	template: require('./template'),	
	controller: ['$scope', '$routeParams', '$http', 'editorAuth',
	 function($scope, $routeParams, $http, auth) {
		var id = [$routeParams.owner, $routeParams.name].join('-');
		var page = _.pick($scope.$pages, id);
		$scope.page = SETTINGS.config.posts + '/' + id + '.html';
		if (! _.isEmpty(page) )
		{
			$scope.seo.title = page[id].title;
			$scope.seo.description = page[id].blurb;
		}
		else 
			$scope.seo.title = '9 Dots STEM Curriculum';
		// XXX implement page view guard
		$http.post(SETTINGS.config.backend + '/post/view', {id: id});
		$scope.scroll = function($scope){
			var target = $('.page-content-wrap').offset().top;
		   $('body').animate({scrollTop:target}, 300);
		};
	}],
	render: require('./renderClient'),
	pages: pages,
	scrollTo: require('./scrollTo')
};

var app = angular.module('app');
var blur = require('blur');
app.directive('blur', blur.directive);
app.filter('blur', blur.filter);
app.filter('idToUrl', function() {
	return function(id) {
		return id.replace('-', '/');
	};
})
app.run(['$http', '$rootScope', '$templateCache', 'editorAuth', 'editorEvents',
	function($http, $rootScope, $templateCache, auth, events) {
	function getPublished() {
		$http.get(SETTINGS.config.backend + '/post/all').success(function(res) {
			_.each(res, function(page) {
				pages[page.id] = page;
			});
			pages.emit('loaded', res);
			window.prerenderReady = true;
		});
	}
	window.prerenderReady = false;
	getPublished();

	function getUnpublished(user) {
		$http.post(SETTINGS.config.backend + '/post/unpublished', {author: user}).success(function(res) {
			_.each(res, function(page) {
				pages[page.id] = page;
				unpublished[page.id] = page;
			});
			pages.emit('loaded', res);
		});
	}
	

	function userUnpublished(user) {
		_.each(unpublished, function(page, id) {
			if (pages[id] && !pages[id].published) {
				delete pages[id];
				pages.emit('remove', page);
			}
		});
		pages.emit('reset');
		unpublished = {};
		if (user) {
			getUnpublished(user);
		}
	}

	if (auth.authenticated()) {
		userUnpublished(auth.username);
	}
	events.on('login', userUnpublished);
	events.on('logout', userUnpublished);

	pages.on('update', function(page) {
		//XXX why is this necessary
		$templateCache.remove(SETTINGS.config.posts + '/' + page.id + '.html');
	});
	$rootScope.$pages = pages;
}]);
