var PostCtrl = require('./post');
var CodeMirror = require('codemirror');
var npm = require('npm');
var _ = npm.underscore;

var Ctrl = module.exports = function($scope, $element, $injector) {
	$injector.invoke(PostCtrl, this, {$scope: $scope, $element: $element});

	this.postLoad = function() {
		this.initEditor();
	};

  this.initData = function() {
    this.data.metadata.type = 'lesson';
  };

  this.showAttachments = function() {
    return this.mode === 'edit';
  }

  this.addAttachment = function(path, name) {
    console.log('addAttachment', path, name);
    this.data.metadata.attachments = this.data.metadata.attachments || [];
    this.data.metadata.attachments.push({path: path, name: name});
  }

  this.removeAttachment = function(index) {
    this.data.metadata.attachments.splice(index, 1);
  };

 	this.keyMap = function() {
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
  };

  this.initEditor = function() {
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

  };

  this.refreshCodeMirror = function() {
    this.editor.refresh();
  };

  this.hideDialog = function() {
    var self = this;
    $scope.$safeApply(function() {
      self.dialog = '';
    });
  };

  this.dialogClass = function() {
    var cls = {};
    if (this.dialog) {
      cls.dialog = true;
      cls[this.dialog] = true;
    } else {
      cls.dialog = false;
    }
    return cls;
  };

  this.markdownSnippet = function(e) {
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
  };

  this.dialogInsert = function(e) {
    var $dialog = $('#dialog', this.el);
    var $target = $(e.target, this.el);
    var type = $target.data('type');

    if (type === 'link') {
      var href = $('input[name="href"]').val();
      var text = $('input[name="text"]').val();
      var title = $('input[name="title"]').val();

      if (!text) text = href;

      if (title) {
        this.editor.replaceSelection('[' + text + '](' + href + ' "' + title + '") ', 'end');
      } else {
        this.editor.replaceSelection('[' + text + '](' + href + ') ', 'end');
      }

      this.editor.focus();
    }

    return false;
  };

  this.dialogInsertImage = function(src) {
    var alt = $('input[name="alt"]').val();
    this.editor.replaceSelection('![' + alt + '](' + src + ') ', 'end');
    this.editor.focus();
  };

  this.heading = function(s) {
    if (s.charAt(0) === '#' && s.charAt(2) !== '#') {
      this.editor.replaceSelection(_.lTrim(s.replace(/#/g, '')));
    } else {
      this.editor.replaceSelection('## ' + s.replace(/#/g, ''), 'end');
    }
  };

  this.subHeading = function(s) {
    if (s.charAt(0) === '#' && s.charAt(3) !== '#') {
      this.editor.replaceSelection(_.lTrim(s.replace(/#/g, '')));
    } else {
      this.editor.replaceSelection('### ' + s.replace(/#/g, ''));
    }
  };

  this.italic = function(s) {
    if (s.charAt(0) === '_' && s.charAt(s.length - 1 === '_')) {
      this.editor.replaceSelection(s.replace(/_/g, ''));
    } else {
      this.editor.replaceSelection('_' + s.replace(/_/g, '') + '_');
    }
  };

  this.bold = function(s) {
    if (s.charAt(0) === '*' && s.charAt(s.length - 1 === '*')) {
      this.editor.replaceSelection(s.replace(/\*/g, ''));
    } else {
      this.editor.replaceSelection('**' + s.replace(/\*/g, '') + '**');
    }
  };

  this.quote = function(s) {
    if (s.charAt(0) === '>') {
      this.editor.replaceSelection(_.lTrim(s.replace(/\>/g, '')));
    } else {
      this.editor.replaceSelection('> ' + s.replace(/\>/g, ''));
    }
  };


  this.bodyTemplate = 'editor/lesson-body.html';

	this.init();
};