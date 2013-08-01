var npm = require('npm');
var _ = npm.underscore;
var url = require('url');

module.exports = ['$scope', 'editorEvents', '$routeParams', '$location', 'editorModels', 'editorAuth',
	function($scope, events, $routeParams, $location, models, auth) {
	$scope.vert = this;
  $scope.auth = auth;

	var ctrl = this;
	$scope.$on('$routeChangeSuccess', function(evt, current) {
		ctrl.mode = $location.path().split('/')[1];
    var parse = url.parse(window.location.href);
    $scope.redirectUri = 'http://' + parse.host + '/login?redirect_uri=' + $location.path();

	});

  events.on('editMode', function(mode) {
    ctrl.editMode = mode;
  });

	this.init = function() {
		events.on('close', _.bind(this.close, this));
		events.on('updateSaveState', _.bind(this.updateSaveState, this));
		events.on('deleted', _.bind(this.deleted, this));
		// set this to new somehow
		//$scope.mode = 'edit';
	}

	this.new = function() {
		$location.path('/edit/' + models.newName());
		$location.search('new', true);
	};

	this.edit = function(e) {

		if (this.mode === 'edit') {
			$scope.sidebar = '';
    	events.emit('edit', e);
		} else {
			console.log('change path');
			$location.path('/edit/' + $routeParams.page);
		}
		
  };

  this.preview = function(e) {
  	$scope.sidebar = '';
    events.emit('preview', e);
  };

  this.meta = function(e) {
  	$scope.sidebar = '';
    if ($(e.target).hasClass('active')) {
      this.cancel();
    } else {
      events.emit('meta', e);
      $('.navigation a').removeClass('active');
      $(e.target).addClass('active');
    }
    return false;
  };

  this.cancel = function(e) {
    $scope.sidebar = '';
    events.emit('cancel', e);
    return false;
  };

  this.settings = function(e) {
  	var $navItems = $('.navigation a');
    if ($(e.target).hasClass('active')) {
      this.cancel();
    } else {
    	var ctrl = $('#post').controller();
    	this.writeable = ctrl.data.writeable;
      $scope.sidebar = 'settings';
    }

    return false;
  };

  this.save = function(e) {
    if (this.editMode === 'save') {
      this.cancel();
    } else {
    	events.emit('save', e);
    	$scope.sidebar = 'save';

    	var ctrl = $('#post').controller();
    	this.writeable = ctrl.data.writeable;

      var filename = $routeParams.page.split('.')[0] + '.md';
      var placeholder = 'updated ' + filename;
      if ($scope.mode === 'new') {
        placeholder = 'created ' + filename;
      }
      this.commitPlaceholder = placeholder;
      this.commitMessage = '';
      setTimeout(function() {
      	$('.commit-message').focus();
      });
    }

    return false;
  };

  this.commitFile = function() {
  	var commitMessage = this.commitMessage || this.commitPlaceholder;
    events.emit('updateFile', 'saveFile', commitMessage);
  };

  this.deleteFile = function(e) {
    events.emit('deleteFile', e);
  };

  this.deleted = function() {
  	$scope.sidebar = '';
  	$location.path('/');
  }

  this.close = function() {
  	this.edit();
  };

  this.updateSaveState = function(message, state) {
  	var self = this;
  	$scope.$safeApply(function() {
  		self.saveMessage = message;
  		self.saveState = state;
  	});
  };

  this.saveClass = function() {
    var map = {};
    map[this.saveState] = true;
    if (this.editMode === 'save')
      map.active = true;
    return map;
  }

  this.init();

}];