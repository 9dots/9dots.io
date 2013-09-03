var npm = require('npm');
var _ = npm.underscore;
var url = require('url');

module.exports = ['$scope', 'editorEvents', '$routeParams', '$location', 'editorModels', 'editorAuth', '$attrs', 'pages',
	function($scope, events, $routeParams, $location, models, auth, $attrs, pages) {
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

    if (repo && auth.authenticated()) {
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

  console.log('vert setup');


	$scope.$on('$routeChangeSuccess', setMode);
  setMode();


  var callbacks = ['close', 'deleted', 'setEditMode'];
  var callbacksMap = {
    setEditMode: 'editMode'
  };

	this.init = function() {
    var self = this;
    _.each(callbacks, function(callback) {
      if (callbacksMap[callback])
        events.on(callbacksMap[callback], self[callback]);
      else
        events.on(callback, self[callback]);
    });

    self.setEditMode($attrs.defaultEditMode || 'edit');

		// set this to new somehow
		//$scope.mode = 'edit';
	}

	this.edit = function(e) {
		$scope.sidebar = '';
    events.emit('edit', e);
  };

  this.editPath = function() {
    var id = this.page;
    console.log('id', id, pages[id]);
    return pages.get(id) && '/edit/' + (pages.get(id).type || 'lesson') + '/' + id;
  }

  this.preview = function(e) {
  	$scope.sidebar = '';
    events.emit('preview', e);
  };

  this.meta = function(e) {
  	$scope.sidebar = '';
    events.emit('meta', e);
    $('.navigation a').removeClass('active');
    $(e.target).addClass('active');
    return false;
  };

  this.save = function(e) {
  	events.emit('save', e);
  	$scope.sidebar = 'save';

  	var ctrl = $('#post').controller('post');
    console.log('ctrl', ctrl);
  	this.writeable = ctrl.data.writeable;

    var placeholder = null;
    if (this.mode === 'new') {
      placeholder = 'created new post';
    } else {
      var filename = $routeParams.path.split('.')[0] + '.md';
      placeholder = 'updated ' + filename;
    }
    this.commitPlaceholder = placeholder;
    this.commitMessage = '';
    setTimeout(function() {
    	$('.commit-message').focus();
    });


    return false;
  };

  this.commitFile = function() {
  	var commitMessage = this.commitMessage || this.commitPlaceholder;
    console.log('commitMessage', commitMessage);
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

  this.setEditMode = function(mode) {
    console.log('set editMode', mode)
    ctrl.editMode = mode;
  };

  this.remove = function() {
    var self = this;
    // remove listeners
    _.each(callbacks, function(callback) {
      if (callbacksMap[callback])
        events.off(callbacksMap[callback], self[callback]);
      else
        events.off(callback, self[callback]);
    });
  }

  _.bindAll.apply(_,[this].concat(callbacks));
  $scope.$on('$destroy', _.bind(this.remove, this));

  this.init();

}];