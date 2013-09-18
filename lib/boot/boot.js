

var app = angular.module('app', []); 

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

app.config(function($routeProvider, $locationProvider) {
  $routeProvider.when('/', search);
  	
	
  editor.route($routeProvider);

  $routeProvider.when('/*path', markdown);
 
  // configure html5 to get links working on jsfiddle
  $locationProvider.html5Mode(true);
});

app.run(['$rootScope',  function($rootScope) {
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
}]);


