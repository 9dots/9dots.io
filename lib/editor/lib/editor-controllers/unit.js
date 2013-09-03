var PostCtrl = require('./post');
require('sortable');

var Ctrl = module.exports = function($scope, $element, $injector, pages) {
	 $injector.invoke(PostCtrl, this, {$scope: $scope, $element: $element});
	 this.postLoad = function() {

	 };
	 this.initData = function() {
	 	this.data.metadata.type = 'unit';
	 	this.data.metadata.layout = 'unit';
	 	this.data.metadata.lessons = [];
	 };
	 this.pageQuery = function(query) {
	 	console.log('pageQuery', query);
	 	return pages.query(query);
	 };
	 this.getPage = function(id) {
	 	return pages.pages[id];
	 };
	 this.addLesson = function(lesson) {
	 	this.data.metadata.lessons.push(lesson.id);
	 	console.log('lessons', this.data.metadata.lessons);
	 };
	 this.removeLesson = function(idx) {
	 	console.log('removeLesson', idx);
	 	this.data.metadata.lessons.splice(idx, 1);
	 	console.log('lessons', this.data.metadata.lessons);
	 };
	 this.bodyTemplate = 'editor/unit-body.html';
	 this.init();
};

Ctrl.$inject = ['$scope', '$element', '$injector', 'pages'];