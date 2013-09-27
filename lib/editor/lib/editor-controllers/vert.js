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
    if (ctrl.mode !== 'edit' && ctrl.mode !== 'new') {
      repo = auth.userRepo.name;
      owner = $location.path().split('/')[1];
    }

    if (repo && auth.authenticated()) {
      models.isCollaborator(owner, repo, user, function(err) {
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
    events.emit('edit', e);
  };

  this.editPath = function() {
    var pageUrl = this.page;
    var id = pageUrl && pageUrl.replace('/', '-');
    return pages.get(id) && '/edit/' + (pages.get(id).type || 'lesson') + '/' + pageUrl;
  }

  this.preview = function(e) {
    console.log('emit preview');
    events.emit('preview', e);
  };

  this.meta = function(e) {
    events.emit('meta', e);
    $('.navigation a').removeClass('active');
    $(e.target).addClass('active');
    return false;
  };

  this.save = function(e) {
  	events.emit('save', e);
  	this.writeable = true;
    return false;
  };

  this.commitFile = function() {
    events.emit('updateFile', 'saveFile');
  };

  this.deleteFile = function(e) {
    events.emit('deleteFile', e);
  };

  this.deleted = function() {
  	$location.path('/');
  }

  this.close = function() {
  	this.edit();
  };

  this.setEditMode = function(mode) {
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