var PostCtrl = require('./post');
require('sortable');

var Ctrl = module.exports = function($scope, $element, $injector, pages) {
	 $injector.invoke(PostCtrl, this, {$scope: $scope, $element: $element});

	 this.initData = function() {
	 	this.data.metadata.type = 'unit';
	 	this.data.metadata.lessons = [];
	 };
	 this.pageQuery = function(query) {
	 	console.log(query);
	 	var self = this;
	 	return _.filter(pages.query(query), function(page) {
	 		return self.data.metadata.lessons.indexOf(page.id) === -1 && page.type === 'lesson';
	 	});
	 };
	 this.getPage = function(id) {
	 	return pages.pages[id];
	 };
	 this.addLesson = function(lesson) {
	 	this.data.metadata.lessons.push(lesson.id);
	 };
	 this.removeLesson = function(idx) {
	 	this.data.metadata.lessons.splice(idx, 1);
	 };
	 this.bodyTemplate = 'editor/unit-body.html';
	 this.init();
};

Ctrl.$inject = ['$scope', '$element', '$injector', 'pages'];