var PostCtrl = require('./post');


var Ctrl = module.exports = function($scope, $element, $injector) {
	$injector.invoke(PostCtrl, this, {$scope: $scope, $element: $element});

  this.sections = [
    {title: 'Setup', body: 'Materials, prep, and time...'},
    {title: 'Introduce', body: 'Hook, goals, and project introduction...'}, 
    {title: 'Guided Practice', body: 'Guided questions and research...'},
    {title: 'Explore', body: 'Independent hand on learning...'},
  ];

  this.readContent = function() {
    return this.content;
  };

  this.writeContent = function(content) {
    this.content = content;
  }

  this.initData = function() {
    this.data.metadata.type = 'lesson';
    this.data.content = _.map(this.sections, function(section) {
      return content = '## ' + section.title + '\n' + section.body;
    }).join('\n\n');
  };

  this.showAttachments = function() {
    return this.mode === 'edit';
  }

  this.addAttachment = function(path, name) {
    this.data.metadata.attachments = this.data.metadata.attachments || [];
    this.data.metadata.attachments.push({path: path, name: name});
  }

  this.removeAttachment = function(index) {
    this.data.metadata.attachments.splice(index, 1);
  };

 	


  this.bodyTemplate = 'editor/lesson-body.html';

	this.init();
};