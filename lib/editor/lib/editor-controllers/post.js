

//var chosen = require('chosen-jquery-browserify');

var npm = require('npm');
var _ = npm.underscore;
var jsyaml = npm['js-yaml'];
var marked = npm.marked;
var diff = npm.diff;
var path = npm.path;
var markdown = require('markdown');

var Ctrl = module.exports = 
  function($scope, $routeParams, $element, userData, models, state, auth, events, pages, $location, $templateCache, $http, $user, setupUserRepo, $sce) {

    var callbacks = ['edit', 'preview', 'save', 'updateFile', 'deleteFile'];

    _.extend(this, {

      init: function() {
        var self = this;
        this.events = events;

        // setup callbacks
        _.each(callbacks, function(callback) {
          events.on(callback, self[callback]);
        });

        var file = $routeParams.path;
        if (!file) {
          file = $location.search().name || models.newName();
          this.newFile = true;
          $location.replace();
          $location.search('name', file);
        }

        if (this.newFile)
          this.newFileClass = 'new-file';
        else
          this.newFileClass = 'edit-file';

        this.$user = $user;
        $user.on('orgs', function() {
          $scope.$digest();
        });
        this.file = file;
        var fileWithExt = this.fileWithExt = file + '.md';

        var repo, user;
        if ($routeParams.user || this.newFile) {
          repo = this.repo = auth.userRepo;
          user = this.user = $routeParams.user || auth.username;
        } else {
          repo = this.repo = auth.repo;
          user = this.user = '9dots';
        }

        this.filepath = path.join(repo.path, fileWithExt);

        this.edit('edit');

        var destroyed = false;
        $scope.$on('$destroy', function() {
          destroyed = true;
        });

        var ctrl = this;
        if (!this.newFile) {
          models.loadPost(user, repo.name, repo.branch, repo.path, fileWithExt, _.bind(function(err, data) {
            if (destroyed)
              return;

            var savedData = this.stashGet(true).data;

            if (savedData && data && +new Date(data.metadata.updateAt) < +new Date(savedData.metadata.updateAt))
              this.data = savedData;
            else if (! err)
              this.data = data;
            else if (savedData) {
              this.data = savedData;
            } else {
              throw new Error('This file does not exit');
            }
            this.writeContent(this.data.content);
            this.prevFile = this.serialize();

            this.stashApply();
            
            $scope.$safeApply();

          }, this));
        } else {
          this.data = {
            content: '',
            metadata: {
              author: user,
              views: 0,
              published: false
            },
            writeable: true,
            persisted: false,
            repo: models.getRepo(user, repo.name)
          };
          this.initData();
          this.writeContent(this.data.content);
          this.stashApply();

        }


        // initialize
        $scope.post = this;

        this.model = userData;

        // TODO: remove listener
        $(window).on('pagehide', _.bind(this.stashFile, this));
        $scope.$on('$locationChangeStart', function() {
          ctrl.stashFile();
        });

      },
      readContent: function() {
        // Virtual Method
      },
      writeContent: function() {
        // Virtual Method
      },
      setMode: function(mode) {
        this.mode = mode;
        events.emit('editMode', this.mode);
      },
      owner: function() {
        return this.data.metadata.org || this.user;
      },
      id: function() {
        return [this.owner(), this.file].join('-');
      },
      serialize: function() {
        var metadata = _.clone(this.data.metadata);
        if (!metadata.id) 
          metadata.id = this.id();
        //XXX quick hack
        _.each(metadata.attachments, function(attachment) {
          delete attachment.$$hashKey;
        });
        metadata = jsyaml.dump(metadata);
        return ['---', metadata, '---'].join('\n') + '\n\n' + this.readContent();
      },
      stashFile: function(save) {
        if (!window.sessionStorage || !this.data) return false;

        var store = window.sessionStorage;
        var filepath = this.file;
        var ns = save === true ? 'saved:' : '';

        // Don't stash if filepath is undefined
        if (filepath) {
          store.setItem(ns + filepath, JSON.stringify({
            sha: this.data.sha,
            content: this.readContent(),
            metadata: this.data.metadata,
            dirty: this.dirty
          }));
        }
      },

      stashGet: function(save) {
        if (!window.sessionStorage) return false;

        var store = window.sessionStorage;
        var filepath = this.file;
        var ns = save ? 'saved:' : '';
        var key = ns + filepath;
        var item = store.getItem(key);
        var stash = JSON.parse(item);
        return {data: stash, content: item, key: key};
      },

      stashRemove: function(sg) {
        if (sg.item) {
          var store = window.sessionStorage;
          store.removeItem(sg.key);
        }
      },

      stashApply: function() {

        var sg = this.stashGet();
        if (!sg) return;
        var stash = sg.data;

        if (stash && stash.dirty) {
          this.makeDirty();
        }

        if (stash && stash.sha === this.data.sha) {
          // Restore from stash if file sha hasn't changed
          if (stash.content && this.readContent() !== stash.content) {
            this.writeContent(stash.content);
          }
          this.data.metadata = stash.metadata;
          this.data.writeable = true;
        } else {
          // Remove expired content
          this.stashRemove(sg);
        }
      },

      edit: function(e) {
        var view = this;

        view.setMode('edit');
        view.setupMeta();

        return false;
      },

      preview: function(e) {
        this.setMode('preview');
        this.setupPreview();
      },

      setupPreview: function() {
        var metadata = _.clone(this.data.metadata);
        metadata.content = this.readContent();
        this.previewUrl && $templateCache.remove(this.previewUrl);
        this.previewUrl = '/editor/preview/' + Math.random();
        $templateCache.put(this.previewUrl, markdown.render(metadata));
      },

      compilePreview: function(content) {
        // Scan the content search for ![]()
        // grab the path and file and form a RAW github aboslute request for it
        var scan = /\!\[([^\[]*)\]\(([^\)]+)\)/g;
        var image = /\!\[([^\[]*)\]\(([^\)]+)\)/;
        var titleAttribute = /".*?"/;

        // Build an array of found images
        var result = content.match(scan);

        // Iterate over the results and replace
        _(result).each(function(r) {
            var parts = (image).exec(r);

            if (parts !== null) {
              var path = parts[2];

              if (!_.absolutePath(path)) {
                // Remove any title attribute in the image tag is there is one.
                if (titleAttribute.test(path)) {
                  path = path.split(titleAttribute)[0];
                }

                var raw = auth.raw + '/' + app.state.user + '/' + app.state.repo + '/' + app.state.branch + '/' + path;
                if (app.state.isPrivate) {
                  // append auth param
                  raw += '?login=' + cookie.get('username') + '&token=' + cookie.get('oauth-token');
                }

                content = content.replace(r, '![' + parts[1] + '](' + raw + ')');
              }
            }
        });
        console.log(content);

        return content;
      },

      setupMeta: function() {

        setTimeout(function() {
          var queryEl = $('#blurb');

          function updateAtWho() {
            queryEl.atwho({
              at: '#',
              data: _.keys(pages.tags)
            })
            .atwho({
              at: '@',
              data: _.keys(pages.authors)
            });
          }

          pages.pages.on('update', _.throttle(updateAtWho));
          updateAtWho();


          queryEl.on('inserted.atwho', function() {
            queryEl.trigger('input');
          });
        })

      },

      published: function() {
        return this.data && this.data.metadata.published;
      },

      publishedText: function() {
        return this.data && this.data.metadata.published ? 'Published' : 'Unpublished';
      },

      togglePublish: function() {
        this.data.metadata.published = !this.data.metadata.published;
        this.makeDirty();
      },

      deleteFile: function() {
        var repo = auth.repo;
        var file = this.file;
        var view = this;
        if (confirm('Are you sure you want to delete this file?')) {
          models.deletePost(this.user, repo.name, repo.branch, repo.path, file, function (err) {
            if (err)
              return alert('Error during deletion. Please wait 30 seconds and try again.');
            $scope.$safeApply(function() {
              view.events.emit('deleted');
            });
          });
        }
        return false;
      },

      makeDirty: function(e) {
        this.dirty = true;
        // Pass a popover span to the avatar icon
        //$('.save-action', this.el).find('.popup').html(this.data.alterable ? 'save' : 'submit');
      },

      toggleButton: function(e) {
        // Check whether this.model.metadata.published exists
        // if it does unpublish and vice versa
        var $target = $(e.target);
        var value = $target.val();

        if (value === 'true') {
          $target.val(false).html($target.data('off'));
        } else if (value === 'false') {
          $target.val(true).html($target.data('on'));
        }

        this.makeDirty();
        return false;
      },

      computeDiff: function() {
        //TODO: text 1 '' if new file
        //this.data.metadata.updateAt = new Date();
        var text1 = _.escape(this.prevFile && this.prevFile.replace(/<!--(.*)-->/g, ''));
        var text2 = _.escape(this.serialize().replace(/<!--(.*)-->/g, ''));
        var d = diff.diffWords(text1, text2);
        var compare = '';

        for (var i = 0; i < d.length; i++) {
          if (d[i].removed) {
            compare += '<del>' + d[i].value + '</del>';
          } else if (d[i].added) {
            compare += '<ins>' + d[i].value + '</ins>';
          } else {
            compare += d[i].value;
          }
        }

        this.html = $sce.trustAsHtml('<pre>' + compare + '</pre>');
      },

      save: function() {
        this.setMode('save');
        this.computeDiff();
        var placeholder = null;
        if (this.mode === 'new') {
          placeholder = 'created new post';
        } else {
          var filename =  + '.md';
          placeholder = 'updated ' + this.fileWithExt;
        }
        this.commitPlaceholder = placeholder;
        this.commitMessage = '';
        setTimeout(function() {
          $('.commit-message').focus();
        });
      },

      saveFile: function(filecontent) {
        var view = this;
        if (this.data.metadata.org) {
          setupUserRepo(this.data.metadata.org, function(err) {
            if (err) {
              view.save = 'error;'
              return;
            }
            view._saveFile(filecontent);
          });
        } else {
          this._saveFile(filecontent);
        }
        this.save = 'saving';
      },

      _saveFile: function(filecontent) {
        var message = this.commitMessage || this.commitPlaceholder;
        var view = this;
        var repo = this.repo;
        var owner = this.data.metadata.org || this.user;
        models.saveFile(owner, repo.name, repo.branch, view.filepath, filecontent, message, function(err, res) {
          if (err) console.log('err', err);
          $scope.$safeApply(function() {
            if (err) {
              view.save = 'error';
              return;
            }

            view.dirty = false;
            view.data.persisted = true;

            var data = _.clone(view.data.metadata);
            data.content = view.readContent();
            data.id = view.id();

            function success() {
              view.prevFile = filecontent;
              view.events.emit('close');
              view.save = 'saved';
              view.stashFile(true);
              if (view.newFile) {
                $location.path('/edit/' + view.data.metadata.type + '/' + owner + '/' + view.file);
                $location.search('name', null);
              }
              pages.update(data);
            }

            function error() {
              view.save = 'error';
            }

            
            if (view.newFile) {
              $http.post(SETTINGS.config.backend + '/post', data)
                .success(success)
                .error(error);
            } else {
              $http.put(SETTINGS.config.backend + '/post/' + data.id, data)
                .success(success)
                .error(error);
            }
          });

        });

        
      },


      updateFile: function(method, message) {
        var filecontent = this.serialize();
        this[method](filecontent, message);
      },



      remove: function () {
        var self = this;
        // remove listeners
        _.each(callbacks, function(callback) {
          events.off(callback, self[callback]);
        });

        this.previewUrl && $templateCache.remove(this.previewUrl);


        $(window).unbind('pagehide');
      },

      showSidebar: function() {
        return true;
      }


    });

    _.bindAll.apply(_,[this].concat(callbacks));
    $scope.$on('$destroy', _.bind(this.remove, this));

  };

Ctrl.$inject = ['$scope', '$routeParams', '$element', 'editorUserData', 'editorModels', 'editorState', "editorAuth", 'editorEvents', 'pages', '$location', '$templateCache', '$http', 'user', 'setupUserRepo', '$sce']

