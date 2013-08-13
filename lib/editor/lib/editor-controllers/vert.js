var npm = require('npm');
var _ = npm.underscore;
var url = require('url');

module.exports = ['$scope', 'editorEvents', '$routeParams', '$location', 'editorModels', 'editorAuth',
	function($scope, events, $routeParams, $location, models, auth) {
	$scope.vert = this;
  $scope.auth = auth;

  var ctrl = this;
  function setMode() {
    ctrl.editable = false;
    ctrl.mode = $location.path().split('/')[1];
    ctrl.page = $routeParams.path;

    var user = auth.username;

    var owner, repo;
    if (ctrl.mode === 'u') {
      repo = auth.userRepo.name;
      owner = $location.path().split('/')[2];
    } else if (ctrl.mode === 'p') {
      repo = auth.repo.name;
      owner = '9dots';
    }

    if (repo) {
      models.isCollaborator(owner, repo, user, function(err) {
        console.log('isCollaborator', err);
        if (!err) {
          $scope.$apply(function() {
            ctrl.editable = true;
          });
        }
      });
    }
  }


	$scope.$on('$routeChangeSuccess', setMode);
  setMode();

  events.on('editMode', function(mode) {
    console.log('editMode', mode);
    ctrl.editMode = mode;
  });
  ctrl.editMode = 'edit';

	this.init = function() {
		events.on('close', _.bind(this.close, this));
		events.on('updateSaveState', _.bind(this.updateSaveState, this));
		events.on('deleted', _.bind(this.deleted, this));
		// set this to new somehow
		//$scope.mode = 'edit';
	}

	this.edit = function(e) {

		if (this.mode === 'edit' || this.mode === 'new') {
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

      var placeholder = null;
      if (this.mode === 'new') {
        placeholder = 'created new post';
      } else {
        var filename = $routeParams.page.split('.')[0] + '.md';
        placeholder = 'updated ' + filename;
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