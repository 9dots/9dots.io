var PostCtrl = require('./post');


var Ctrl = module.exports = function($scope, $element, $injector) {
	$injector.invoke(PostCtrl, this, {$scope: $scope, $element: $element});

  this.readContent = function() {
    return this.content;
  };

  this.writeContent = function(content) {
    this.content = content;
  }

  this.initData = function() {
    this.data.metadata.type = 'wiki';
  };

  this.showAttachments = function() {
    return false;
  }

  this.showSidebar = function() {
    console.log('mode', this.mode);
    return this.mode === 'save';
  }

  this.bodyTemplate = 'editor/wiki-body.html';

	this.init();
};