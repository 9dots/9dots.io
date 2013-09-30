var npm = require('npm');
var Emitter = require('emitter');

pages = new Emitter();

var unpublished = {};
module.exports = {
	template: require('./template'),	
	controller: ['$scope', '$routeParams', '$http', 'editorAuth',
	 function($scope, $routeParams, $http, auth) {
		var id = [$routeParams.owner, $routeParams.name].join('-');
		$scope.page = SETTINGS.config.posts + '/' + id + '.html';

		// XXX implement page view guard
		$http.post(SETTINGS.config.backend + '/post/view', {id: id});
	}],
	render: require('./renderClient'),
	pages: pages
};

var app = angular.module('app');
app.directive('blur', require('blur'));
app.run(['$http', '$rootScope', '$templateCache', 'editorAuth', 'editorEvents',
	function($http, $rootScope, $templateCache, auth, events) {
	function getPublished() {
		$http.get(SETTINGS.config.backend + '/post/all').success(function(res) {
			_.each(res, function(page) {
				pages[page.id] = page;
			});
			pages.emit('loaded', res);
		});
	}

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
