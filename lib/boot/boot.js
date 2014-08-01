var app = angular.module('app', ['ngRoute']); 

var search = require('search');
var markdown = require('markdown');
var editor = require('editor');
require('footer');

var upload = require('upload');
app.controller('uploadCtrl', upload.controller);
app.filter('upload', upload.filter);

app.directive('mainNav', require('mainNav'));
app.directive('select', require('select'));
app.directive('mdArea', require('md-area'));

var query = null;
if (window.location.pathname === '/' && window.location.hash) {
	query = window.location.hash;
} else if (window.location.pathname[1] === '@') {
	query = window.location.pathname.slice(1);
}

app.config(['$routeProvider', '$locationProvider', '$sceDelegateProvider',
	function($routeProvider, $locationProvider, $sceDelegateProvider) {

	
  $routeProvider.when('/', search);
	
  editor.route($routeProvider);

  $routeProvider.when('/:owner/:name', markdown);
 
  // configure html5 to get links working on jsfiddle
  $locationProvider.html5Mode(true);

  $sceDelegateProvider.resourceUrlWhitelist([SETTINGS.config.posts, SETTINGS.config.uploads, '/'])
}]);

app.run(['$rootScope', '$injector', '$location',  function($rootScope, $injector, $location) {
	$rootScope.__proto__.$safeApply = function(fn) {
	  var phase = this.$root.$$phase;
	  if(phase == '$apply' || phase == '$digest') {
	    if(fn && (typeof(fn) === 'function')) {
	      fn();
	    }
	  } else {
	    this.$apply(fn);
	  }
	};
	$rootScope.__proto__.$searchBind = function(map, defaults) {
    var scope = this
      , $location = $injector.get('$location')
      , $parse = $injector.get('$parse');

    _.each(map, function(searchName, scopeName) {
      var fn = $parse(scopeName);

      scope.$watch(function() {
        return $location.search()[searchName];
      }, function(searchValue) {
        fn.assign(scope, searchValue);
      });

      scope.$watch(scopeName, function(val) {
        if (_.isUndefined(val)
          || (_.isArray(val) && val.length === 0)
          || (_.isString(val) && !val))
          val = null;

        $location.replace();
        if (defaults && val === defaults[searchName])
        	$location.search(searchName, null);
        else
        	$location.search(searchName, val);
      }, true);
    });
  };

  // hashSearch hack
  if (query) {
  	$location.replace();
  	$location.search('query', query);
  	$location.path('/');
  }

}]);


