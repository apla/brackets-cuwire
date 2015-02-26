define(function (require, exports, module) {
	"use strict";

	var moduleId = "me.apla.brackets-cuwire";

	var ExtensionUtils     = brackets.getModule("utils/ExtensionUtils"),
		CommandManager     = brackets.getModule('command/CommandManager'),
		Commands           = brackets.getModule('command/Commands'),
		EditorManager      = brackets.getModule('editor/EditorManager'),
		FileSystem         = brackets.getModule('filesystem/FileSystem');

	function jumpToFile (file, line, ch) {
		if (file.constructor === Array) {
			file = file.join ('/');
		}

		// TODO: dirty
		FileSystem.resolve (file, function (err, fileObj, stat) {
			if (err)
				return;
			var editor = EditorManager.getCurrentFullEditor ();
//			console.log (line, ch);
			if (editor.getFile().fullPath !== fileObj.fullPath) {
				CommandManager.execute(Commands.FILE_OPEN, fileObj).done(function () {
					var editor = EditorManager.getFocusedEditor();
					editor.setCursorPos(line, ch, true, false);
					editor.focus();
					// result.resolve (true);
				});
			} else {
				editor.setCursorPos(line, ch, true, false);
				editor.focus();
			}
		});
	}

	return {
		jumpToFile: jumpToFile
	}

	// https://s3.amazonaws.com/extend.brackets/registry.json
	var bracketStats = {
		"brackets-cuwire": {
			"metadata": {
				"name":"brackets-cuwire",
				"version":"0.5.2",
				"title":"cuwire: IDE for microcontrollers",
				"homepage":"https://github.com/apla/brackets-cuwire",
				"description":"Now Brackets can be used to develop software for MCUs. Throw away you Arduino, Energia and others.",
				"author":{"name":"Ivan Baktsheev"},
				"license":"MIT",
				"engines":{"brackets":">=1.1.0"},
				"repository":{"type":"git","url":"https://github.com/apla/brackets-cuwire"},
				"scripts":{"archive-old":"git archive --format zip -o release/${npm_package_name}-${npm_package_version}.zip master","archive":"git-archive-all --prefix='' release/${npm_package_name}-${npm_package_version}.zip","prepare-binaries":"","xxx":"set"}
			},
			"owner":"github:apla",
			"versions":[
				{"version":"0.4.2","downloads":525},
				{"version":"0.5.1","downloads":403},
				{"version":"0.5.2","downloads":144}
			],
			"totalDownloads":1072,
			"recent":{
				"20150205":46,
				"20150206":43,
				"20150207":27,
				"20150208":26,
				"20150209":92,
				"20150210":146,
				"20150211":35
			}
		}
	}
	});
