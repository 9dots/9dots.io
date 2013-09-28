var PostCtrl = require('./post');


var Ctrl = module.exports = function($scope, $element, $injector) {
	$injector.invoke(PostCtrl, this, {$scope: $scope, $element: $element});

  this.sections = [
    {title: 'Setup'},
    {title: 'Introduce'}, 
    {title: 'Explore'},
    {title: 'Inquire'},
    {title: 'Innovate'},
    {title: 'Discuss'}
  ];
  this.placeholders = {
    'Setup': 'Materials and prep...',
    'Introduce': 'Hook, goals, and project introduction...',
    'Explore': 'Brief unguided exploration...',
    'Inquire': 'Guided questions and research...',
    'Innovate': 'New knowledge is used to create...',
    'Discuss': 'Discussion questions...'
  }
  this.readContent = function() {
    var self = this;
    var contents = [];
    _.each(this.sections, function(section) {
      contents.push(
        '## ' + section.title + '\n' +
        (section.content || '')
      );
    });
    return contents.join('<!-- -->\n');
  };

  this.writeContent = function(content) {
    var self = this;
    if (content) {
      this.sections = [];
      _.each(content.split('<!-- -->\n'), function(section) {
        var titleMatch = section.match(/\#\# ([^\n]+)/);
        if (!titleMatch)
          return;
        var content = section.slice(titleMatch[0].length + 1);
        var title = titleMatch[1];
        self.sections.push({title: title, content: content, placeholder: self.placeholders[title]});
      });
    }
  }

  this.initData = function() {
    this.data.metadata.type = 'lesson';
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