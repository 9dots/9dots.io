

var app = angular.module('app', []); 

var search = require('search');
var markdown = require('markdown');
var editor = require('editor');

app.config(function($routeProvider, $locationProvider) {
	
	console.log('routeProvider', search);
  $routeProvider
  	.when('/', search)
  	.when('/pages/:page', markdown);

  editor.route($routeProvider);
 
  // configure html5 to get links working on jsfiddle
  $locationProvider.html5Mode(true);
});
