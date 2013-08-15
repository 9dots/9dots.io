

//var chosen = require('chosen-jquery-browserify');

var npm = require('npm');
var _ = npm.underscore;
var jsyaml = npm['js-yaml'];
var key = npm.keymaster;
var marked = npm.marked;
var diff = npm.diff;
var Backbone = npm.backbone;
var utils = require('util');
var CodeMirror = require('codemirror');
var path = npm.path;
var markdown = require('markdown');

/*
events: {
      'click .markdown-snippets a': 'markdownSnippet',
      'click .save-action': 'updateFile',
      'click button': 'toggleButton',
      'click .unpublished-flag': 'meta',
      'change input': 'makeDirty'
    },

this.eventRegister = app.eventRegister;

      // Listen for button clicks from the vertical nav
 _.bindAll(this, 'edit', 'preview', 'deleteFile', 'save', 'hideDiff', 'translate', 'updateFile', 'meta', 'remove');
this.eventRegister.bind('edit', this.edit);
this.eventRegister.bind('preview', this.preview);
this.eventRegister.bind('deleteFile', this.deleteFile);
this.eventRegister.bind('save', this.save);
this.eventRegister.bind('hideDiff', this.hideDiff);
this.eventRegister.bind('updateFile', this.updateFile);
this.eventRegister.bind('translate', this.translate);
this.eventRegister.bind('meta', this.meta);
this.eventRegister.bind('remove', this.remove);

this.eventRegister.trigger('documentTitle', context + pathTitle + '/' + app.state.file + ' at ' + app.state.branch);
      this.eventRegister.trigger('sidebarContext', this.data, 'post');
*/

module.exports = ['$scope', '$routeParams', '$element', 'editorUserData', 'editorModels', 'editorState', "editorAuth", 'editorEvents', 'pages', '$location', '$templateCache',
  function($scope, $routeParams, $element, userData, models, state, auth, events, pages, $location, $templateCache) {

    var callbacks = ['edit', 'preview', 'save', 'updateFile', 'deleteFile'];

    _.extend(this, {

      init: function() {
        console.log('init');
        var self = this;
        this.events = events;

        // setup callbacks
        _.each(callbacks, function(callback) {
          events.on(callback, self[callback]);
        });

        var file = $routeParams.path;
        if (!file) {
          file = $location.search().name || models.newName();
          console.log('file', file);
          this.newFile = true;
          $location.replace();
          $location.search('name', file);
        }



        this.file = file;
        var fileWithExt = file + '.md';
        
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
            if (err)
              throw new Error('This file does not exist.');
            if (destroyed)
              return;

            this.data = data;
            data.repo.getSha(auth.repo.branch, auth.repo.path + '/' + fileWithExt, function(err, sha) {
              $scope.$safeApply(function() {
                data.sha = sha;
                ctrl.stashApply();
              });
            });
            this.prevFile = this.serialize();
            this.initEditor();
            $scope.$safeApply();

          }, this));
        } else {
          this.data = {
            content: '',
            metadata: {
              date: new Date(),
              published: false,
              layout: 'post'
            },
            writeable: true,
            persisted: false,
            repo: models.getRepo(user, repo.name)
          };
          this.initEditor();
          this.stashApply();

          

        }


        // initialize
        $scope.post = this;

        this.model = userData;

        // TODO: remove listener
        $(window).on('pagehide', _.bind(this.stashFile, this));
        $scope.$on('$locationChangeStart', function() {
          console.log('locationchange');
          ctrl.stashFile();
        });

      },
      setMode: function(mode) {
        this.mode = mode;
        events.emit('editMode', this.mode);
      },
      serialize: function() {
        var metadata = jsyaml.dump(this.data.metadata);
        return ['---', metadata, '---'].join('\n') + '\n\n' + this.data.content;
      },
      stashFile: function(e) {
        if (e) e.preventDefault();
        if (!window.sessionStorage) return false;

        var store = window.sessionStorage;
        var filepath = this.file;

        // Don't stash if filepath is undefined
        if (filepath) {
          store.setItem(filepath, JSON.stringify({
            sha: this.data.sha,
            content: this.editor ? this.editor.getValue() : null,
            metadata: this.data.metadata,
            dirty: this.dirty
          }));
          console.log('dirty', this.dirty);
        }
      },
      stashApply: function() {
        if (!window.sessionStorage) return false;

        var store = window.sessionStorage;
        var filepath = this.file;
        var item = store.getItem(filepath);
        var stash = JSON.parse(item);

        if (stash && stash.dirty) {
          console.log('sashed dirty');
          this.makeDirty();
        }

        if (stash && stash.sha === this.data.sha) {
          // Restore from stash if file sha hasn't changed
          if (this.editor && this.editor.setValue && stash.content && this.data.content !== stash.content) {
            this.editor.setValue(stash.content);
          }
          this.data.metadata = stash.metadata;
        } else if (item) {
          // Remove expired content
          store.removeItem(filepath);
        }

        console.log('metadata', this.data.metadata);
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
        metadata.content = this.data.content;
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
        console.log('published', this.data && this.data.metadata.published);
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
        if (this.editor && this.editor.getValue) this.data.content = this.editor.getValue();

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
        var text1 = _.escape(this.prevFile);
        var text2 = _.escape(this.serialize());
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

        this.html = '<pre>' + compare + '</pre>';
      },

      save: function() {
        this.setMode('save');
        this.computeDiff();
      },

      refreshCodeMirror: function() {
        this.editor.refresh();
      },

      sendPatch: function(filepath, filename, filecontent, message) {
        // Submits a patch (fork + pull request workflow)

        var view = this;

        function patch() {
          view.model.content = view.prevFile;
          view.editor.setValue(view.prevFile);

          models.patchFile(app.state.user, app.state.repo, app.state.branch, filepath, filecontent, message, function (err) {
            if (err) {
              _.delay(function () {
                view.events.emit('updateSaveState', 'Submit Change', '');
              }, 3000);

              view.events.emit('updateSaveState', '!&nbsp;Try&nbsp;again&nbsp;in 30&nbsp;seconds', 'error');
              return;
            }

            view.dirty = false;
            view.model.persisted = true;
            view.model.file = filename;
            view.updateURL();
            view.prevFile = filecontent;
            view.events.emit('Change Submitted', 'saved');
          });

        }

        view.events.emit('updateSaveState', 'Submitting Change', 'saving');
        patch();

        return false;
      },

      saveFile: function(filecontent, message) {
        var view = this;
        var repo = this.repo;
        console.log('filecontent', filecontent, message);
        models.saveFile(this.user, repo.name, repo.branch, view.filepath, filecontent, message, function(err) {
          if (err) console.log('err', err);
          $scope.$safeApply(function() {
            if (err) {
              this.save = 'error';
              return;
            }
            view.dirty = false;
            view.data.persisted = true;

            if (view.newFile) {
              $location.path('/edit/u/' + view.user + '/' + view.file);
              $location.search('name', null);
            }

            /*if (app.state.mode === 'new') {
              app.state.mode = 'edit';
              view.events.emit('renderNav');
            }*/

            //view.renderHeading();
            //view.updateURL();
            view.prevFile = filecontent;
            view.events.emit('close');
            //view.closeSettings();
            //view.updatePublishState();
            this.save = 'saved';
          });

        });

        this.save = 'saving';
      },


      updateFile: function(method, message) {
        var filecontent = this.serialize();
        this.data.content = this.editor.getValue();
        this[method](filecontent, message);
      },

      keyMap: function() {
        var view = this;

        return {
          'Ctrl-S': function(codemirror) {
            view.updateFile();
          },
          'Cmd-B': function(codemirror) {
            if (view.editor.getSelection() !== '') view.bold(view.editor.getSelection());
          },
          'Ctrl-B': function(codemirror) {
            if (view.editor.getSelection() !== '') view.bold(view.editor.getSelection());
          },
          'Cmd-I': function(codemirror) {
            if (view.editor.getSelection() !== '') view.italic(view.editor.getSelection());
          },
          'Ctrl-I': function(codemirror) {
            if (view.editor.getSelection() !== '') view.italic(view.editor.getSelection());
          }
        };
      },

      initEditor: function() {
        var view = this;

        view.editor = CodeMirror(document.getElementById('code'), {
          mode: 'gfm',
          value: view.data.content,
          lineWrapping: true,
          lineNumbers: true,
          extraKeys: view.keyMap(),
          matchBrackets: true,
          dragDrop: false,
          theme: 'prose-bright'
        });

        view.editor.focus();


        view.editor.on('change', _.bind(view.makeDirty, view));
        view.editor.on('focus', _.bind(function() {

          // If an upload queue is set, we want to clear it.
          this.queue = undefined;

          // If a dialog window is open and the editor is in focus, close it.
          $('.toolbar .group a', this.el).removeClass('on');
          //$('#dialog', view.el).empty().removeClass();
          this.hideDialog();
        }, view));
        view.refreshCodeMirror();

      },

      hideDialog: function() {
        var self = this;
        $scope.$safeApply(function() {
          self.dialog = '';
        });
      },

      dialogClass: function() {
        var cls = {};
        if (this.dialog) {
          cls.dialog = true;
          cls[this.dialog] = true;
        } else {
          cls.dialog = false;
        }
        return cls;
      },

      markdownSnippet: function(e) {
        var view = this;
        var $target = $(e.target, this.el).closest('a');
        var $dialog = $('#dialog', this.el);
        var $snippets = $('.toolbar .group a', this.el);
        var key = $target.data('key');
        var snippet = $target.data('snippet');
        var offset = $target.data('offset');
        var selection = _.trim(this.editor.getSelection());

        this.hideDialog();

        if (snippet) {
          $snippets.removeClass('on');

          this.editor.replaceSelection(snippet, 'end');
          if (offset) {
            var c = this.editor.getCursor();
            offset = parseInt(offset);
            c.ch -= offset;
            this.editor.setCursor(c);
          }
          view.editor.focus();

        } else if ($target.data('dialog')) {

          // This condition handles the link and media link in the toolbar.
          if ($target.hasClass('on')) {
            $target.removeClass('on');
            //$dialog.removeClass().empty();
          } else {
            $snippets.removeClass('on');
            $target.addClass('on');

            switch(key) {
              case 'link':
                view.dialog = 'link';

                if (view.relativeLinks) {
                  $('.chzn-select', $dialog).chosen().change(function() {
                    $('.chzn-single span').text(t('dialogs.link.insertLocal'));

                    var parts = $(this).val().split(',');
                    $('input[name=href]', $dialog).val(parts[0]);
                    $('input[name=text]', $dialog).val(parts[1]);
                  });
                }

                if (selection) {
                  // test if this is a markdown link: [text](link)
                  var link = /\[([^\]]+)\]\(([^)]+)\)/;
                  var quoted = /".*?"/;

                  var text = selection;
                  var href;
                  var title;

                  if (link.test(selection)) {
                    var parts = link.exec(selection);
                    text = parts[1];
                    href = parts[2];

                    // Search for a title attrbute within the url string
                    if (quoted.test(parts[2])) {
                      href = parts[2].split(quoted)[0];

                      // TODO could be improved
                      title = parts[2].match(quoted)[0].replace(/"/g, '');
                    }
                  }

                  $('input[name=text]', $dialog).val(text);
                  if (href) $('input[name=href]', $dialog).val(href);
                  if (title) $('input[name=title]', $dialog).val(title);
                }
              break;
              case 'media':
                view.dialog = 'media';

                if (selection) {
                  var image = /\!\[([^\[]*)\]\(([^\)]+)\)/;
                  var src;
                  var alt;

                  if (image.test(selection)) {
                    var imageParts = image.exec(selection);
                    alt = imageParts[1];
                    src = imageParts[2];

                    $('input[name=url]', $dialog).val(src);
                    if (alt) $('input[name=alt]', $dialog).val(alt);
                  }
                }
              break;
            }
          }
        }

        e.preventDefault();
      },

      dialogInsert: function(e) {
        var $dialog = $('#dialog', this.el);
        var $target = $(e.target, this.el);
        var type = $target.data('type');

        if (type === 'link') {
          var href = $('input[name="href"]').val();
          var text = $('input[name="text"]').val();
          var title = $('input[name="title"]').val();

          if (!text) text = href;

          if (title) {
            this.editor.replaceSelection('[' + text + '](' + href + ' "' + title + '")');
          } else {
            this.editor.replaceSelection('[' + text + '](' + href + ')');
          }

          this.editor.focus();
        }

        return false;
      },

      dialogInsertImage: function(src) {
        var alt = $('input[name="alt"]').val();
        this.editor.replaceSelection('\n![' + alt + '](' + src + ')');
        this.editor.focus();
      },

      heading: function(s) {
        if (s.charAt(0) === '#' && s.charAt(2) !== '#') {
          console.log('if')
          this.editor.replaceSelection(_.lTrim(s.replace(/#/g, '')));
        } else {
          console.log('else')
          this.editor.replaceSelection('## ' + s.replace(/#/g, ''), 'end');
        }
      },

      subHeading: function(s) {
        if (s.charAt(0) === '#' && s.charAt(3) !== '#') {
          this.editor.replaceSelection(_.lTrim(s.replace(/#/g, '')));
        } else {
          this.editor.replaceSelection('### ' + s.replace(/#/g, ''));
        }
      },

      italic: function(s) {
        if (s.charAt(0) === '_' && s.charAt(s.length - 1 === '_')) {
          this.editor.replaceSelection(s.replace(/_/g, ''));
        } else {
          this.editor.replaceSelection('_' + s.replace(/_/g, '') + '_');
        }
      },

      bold: function(s) {
        if (s.charAt(0) === '*' && s.charAt(s.length - 1 === '*')) {
          this.editor.replaceSelection(s.replace(/\*/g, ''));
        } else {
          this.editor.replaceSelection('**' + s.replace(/\*/g, '') + '**');
        }
      },

      quote: function(s) {
        if (s.charAt(0) === '>') {
          this.editor.replaceSelection(_.lTrim(s.replace(/\>/g, '')));
        } else {
          this.editor.replaceSelection('> ' + s.replace(/\>/g, ''));
        }
      },

      remove: function () {
        var self = this;
        // remove listeners
        _.each(callbacks, function(callback) {
          events.off(callback, self[callback]);
        });

        this.previewUrl && $templateCache.remove(this.previewUrl);


        $(window).unbind('pagehide');
      }
    });

    _.bindAll.apply(_,[this].concat(callbacks));
    $scope.$on('$destroy', _.bind(this.remove, this));

    this.init();

  }
];

