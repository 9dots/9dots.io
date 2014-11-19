var PostCtrl = require('./post');

var Ctrl = module.exports = function($scope, $element, $injector) {
	$injector.invoke(PostCtrl, this, {$scope: $scope, $element: $element});

  $scope.submitObjective = function(){
    $scope.post.data.metadata.objective = $scope.post.data.metadata.objective instanceof Array ? $scope.post.data.metadata.objective  : [];
    if ($scope.post.objective) {
      $scope.post.data.metadata.objective.push(this.post.objective);
      $scope.post.objective = '';
    }
  }
  $scope.removeObjective = function(idx) {
    $scope.post.data.metadata.objective.splice(idx, 1);
  }

  this.sections = [
    {title: 'Setup', body: 'Materials, prep, and time...'},
    {title: 'Engage', body: 'Hook, goals, and project introduction...'}, 
    {title: 'Explore', body: 'Brief exploration time...'},
    {title: 'Explain', body: 'How does it work?...'},
    {title: 'Elaborate', body: 'Continue with new information...'},
    {title: 'Evaluate', body: 'Check for understanding... '}
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