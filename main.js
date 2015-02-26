/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, browser: true */
/*global $, define, brackets */

define(function (require, exports, module) {
	"use strict";

	var moduleId = "me.apla.brackets-cuwire";

	var ExtensionUtils     = brackets.getModule("utils/ExtensionUtils"),
		NodeDomain         = brackets.getModule("utils/NodeDomain"),
		PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
		Dialogs            = brackets.getModule("widgets/Dialogs"),
	    DocumentManager    = brackets.getModule("document/DocumentManager"),
		ProjectManager     = brackets.getModule("project/ProjectManager"),
		WorkspaceManager   = brackets.getModule('view/WorkspaceManager'),
		PopUpManager       = brackets.getModule("widgets/PopUpManager"),
		Strings            = brackets.getModule("strings"),
		FileSystem         = brackets.getModule('filesystem/FileSystem');

	var basicDialogMst     = require("text!assets/templates/basic-dialog.mst"),
		boardModsMst       = require("text!assets/templates/board-mods.mst"),
		settingsMst        = require("text!assets/templates/settings.mst"),
		sketchSelectMst    = require("text!assets/templates/sketch-select.mst"),
		runtimeSelectMst   = require("text!assets/templates/runtime-select.mst");

	var boardMods             = Mustache.compile (boardModsMst);
	var settingsRenderer      = Mustache.compile (settingsMst);
	var sketchSelectRenderer  = Mustache.compile (sketchSelectMst);
	var runtimeSelectRenderer = Mustache.compile (runtimeSelectMst);

	var getModulePath = ExtensionUtils.getModulePath.bind (ExtensionUtils, module);

	// completion in another file, easy to move code to external project
	var completion    = require ('completion/main');
	var BracketsTools = require ('src/BracketsTools');
	var Logger        = require ('src/Logger');

	var prefs = PreferencesManager.getExtensionPrefs (moduleId);

//	prefs.definePreference ("board", "object", {});
//	prefs.definePreference ("port", "string", null);

	var stateManager = PreferencesManager.stateManager.getPrefixedSystem (moduleId);

//	prefs.definePreference ("panelVisible", "boolean", false);

//	prefs.definePreference ("patterns", "array", []).on("change", function () {
//	});

	var cuwireDomain = new NodeDomain ("cuwire", getModulePath ("node/cuwireDomain.js"));
	ExtensionUtils.loadStyleSheet (module, "assets/style.css");

	function CuWireExt (require, domain) {
		this.domain = domain;

		this.logger = new Logger ();

		this.createUI (require);
	}

	var app = brackets.getModule('utils/AppInit');

	CuWireExt.prototype.loadNodePart = function () {

	}

	CuWireExt.prototype.boardNameForPort = function (port) {
		var usbPair = [port.vendorId, port.productId].join (':');

		if (this.boardUSBMatch) {
			var boardInfo = this.boardUSBMatch[usbPair];
			if (boardInfo) {
				port.boardInfo = boardInfo;
				return '<b>'+boardInfo.board.name + '</b> ('+port.name+')';
			}
		}
		return port.name;
	}

	CuWireExt.prototype.enumerateSerialPorts = function () {
		// TODO: show spinner indicator

		var self = this;

		var cuwirePortDD = $('#cuwire-panel ul.cuwire-port');
		if (!this.portsDDSubscribed) {
			// can't find the working API for this
			var buttonDD = cuwirePortDD.prev("*[data-toggle=\"dropdown\"]");
			buttonDD.on ('click', function () {
				if (!buttonDD.parent ().hasClass ('open')) {
					self.enumerateSerialPorts ();
				}
			});
//			cuwirePortDD.prev().on ('show.bs.dropdown', function () {
//				console.log (123);
//			});
			this.portsDDSubscribed = true;
		}

		$('<li><a href="#">Updating</a></li>').appendTo(cuwirePortDD);

		this.domain.exec("enumerateSerialPorts")
		.done(function (ports) {
			// TODO: get last used port from preference manager
			// TODO: show warning indicator
			// user must select port prior to launch
			console.log(
				"[brackets-cuwire-node] Available ports:",
				ports.map (function (port) {return port})
			);
			cuwirePortDD.empty ();
			// tr = $('<tr />').appendTo('#cuwire-panel tbody');

			ports.forEach (function (port) {
				$('<li><a href="#">'
				  +self.boardNameForPort (port)
				  + (port.manufacturer ? ' - <i>'+port.manufacturer+'</i>' : "")
				  +"</a></li>")
				.on ('click', self.setPort.bind (self, port))
				.appendTo(cuwirePortDD);
			});

			//		$('<td />').text(err.message).appendTo(tr);
			//		$('<td />').text(err.filename).appendTo(tr);
			self.setPort ();
		}).fail(function (err) {
			// TODO: show error indicator
			console.error("[brackets-cuwire-node] failed to run cuwire.enumerateSerialPorts, error:", err);
		});

	}

	CuWireExt.prototype.setPort = function (port) {
		// TODO: set port in preferences
		if (!port) {
			port = prefs.get ('port');
			// no preference, first launch
			if (!port)
				return;
		} else {
			prefs.set ('port', port);
		}

		var portTitle = port.name.replace (/^\/dev\/(cu\.)?/, "");
		if (port.boardInfo) {
			portTitle = port.boardInfo.board.name + ' ('+portTitle+')';
		}

		$('#cuwire-panel button.cuwire-port').text (portTitle);
	}

	CuWireExt.prototype.showBoardInfo = function (boardId, platformName) {

		var messageData = {
			images: []
		};

		var newBoard = false;
		if (boardId) {
			if (this.board && boardId !== this.board.id) {
				newBoard = true;
			}
			messageData.infoActive = "active";
		} else {
			boardId      = this.board.id;
			platformName = this.platformName;
			messageData.imageActive = "active";
		}

		var boardMeta = this.platforms[platformName].boards[boardId];
		messageData.mods = boardMeta.mods;
		if (boardMeta.mods)
			messageData.modsCount = boardMeta.mods.length;

		// imageOK is null when image not found, is undefined when image loading
		// and true if image cached successfully
		if (boardMeta.imageUrl && boardMeta.imageOk !== null) {
			messageData.images.push ({src: boardMeta.imageUrl});
		}

		messageData.dlgClass = 'cuwire-board-image';
		messageData.title    = boardMeta.name;
		messageData.buttons  = [{
			className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
			id: Dialogs.DIALOG_BTN_OK,
			text: Strings.OK
		}];

		// render cached mustache template
		var dialogBody = boardMods (messageData);

		var formData = {};

		var dlg = Dialogs.showModalDialogUsingTemplate (dialogBody).done ((function (buttonId) {
			if (buttonId === "ok") {
				console.log (formData);
				// CommandManager.execute("debug.refreshWindow");
				var boardMod = {};
				if ("models" in boardMeta) {
					for (var modType in boardMeta.models) {
						boardMod[modType] = formData[modType];
						if (!boardMod[modType]) {
							console.error ('board modification', modType, 'not defined, continue with caution');
						}
					}
				}
				this.setBoard (boardId, platformName, boardMod);
			}
		}).bind (this));

		var boardImg = document.querySelector ('#board-image-tab img');
		if (boardImg) {
			boardImg.style.height = boardImg.parentElement.parentElement.clientHeight - 30 + 'px';
			boardImg.style.margin =  "0 " + parseInt((boardImg.parentElement.parentElement.clientWidth - boardImg.width)/2) + "px";
		}

		var theBoard = this.board;

		var boardModInputs = $("#cuwire-board-mod input");
		// WTF: there is little delay between actual rendering and request to create an dom nodes
		// setTimeout (function () {
			boardModInputs = $("#cuwire-board-mod input");

			// if we had a new board, then we need to discard previous settings
			// TODO: use setFormFields
			boardModInputs.each (function (idx) {
				var typeId = $(this).attr('name');
				var modId  = $(this).attr('value');
				if (newBoard) {
					// select every first radio in every mod
					if (!$(this).prev().length) {
						$(this).prop("checked", true);
					}
				} else {
					// select appropriate inputs from prefs
					if (theBoard && theBoard.mod && theBoard.mod[typeId] && theBoard.mod[typeId] === modId) {
						$(this).prop("checked", true);
					}
				}
//					console.log( index + ": " + $( this ).text() );
			});

			if (boardModInputs[0] && boardModInputs[0].form) {
				var formEl = boardModInputs[0].form;
				formData = getFormFields (formEl);
			}

		// }, 100);

		// WTF: brackets have no option to prevent dialog close
		// I can use autodismiss: false, but this is not works, really
		// WTF: also, you can't do anything with app with modal window open. even quit app!!!


		boardModInputs.change (function() {
			var formEl = $(this)[0].form;
			formData = getFormFields (formEl);
//			console.log (formData);
		});


	}

	CuWireExt.prototype.setBoard = function (boardId, platformName, boardMod) {
		if (!boardId) {
			var boardPref = prefs.get ('board');

			// no preference, first launch
			if (!boardPref)
				return;

			boardId      = boardPref[0];
			platformName = boardPref[1];
			boardMod     = boardPref[2];
		} else {
			prefs.set ('board', [boardId, platformName, boardMod]);
		}

		var self = this;
		// TODO: show a message when board unavailable
		var boardMeta = this.platforms[platformName].boards[boardId];

		this.board = {
			id:    boardId,
			meta:  boardMeta,
			name:  boardMeta.name,
			mod:   boardMod
		};

		this.platformName = platformName;

		var titleButton = $('#cuwire-panel button.cuwire-board');
		if (this.platforms[platformName])
			titleButton.text (boardMeta.name);
	}

	function setFormFields (formEl, fieldsData) {
		for (var i = 0; i < formEl.elements.length; i ++) {
			var formField = formEl.elements[i];
			if (!(formField.name in fieldsData)) {
				continue;
			}

			// TODO: multiple checkboxes value for one form field
			if (formField.type === 'radio' || formField.type === 'checkbox') {
				if (
					formField.value === fieldsData[formField.name]
					|| formField.value === fieldsData[formField.name].toString()
				) {
					formField.checked = true;
				}
			} else {
				formField.value = fieldsData[formField.name];
			}
		}
	}

	function bindFormToData (formEl, formData) {
		[].slice.apply (formEl.elements).forEach (function (el) {
			if (el.type.match (/^(?:radio|checkbox)$/)) {
				el.addEventListener ('change', getFormFields.bind (window, formEl, formData), false);
			} else {
				el.addEventListener ('input', getFormFields.bind (window, formEl, formData), false);
			}
		});
	}

	function getFormFields (formEl, formData) {
		formData = formData || {};
		for (var k in formData) {
			delete formData[k];
		}
		for (var i = 0; i < formEl.elements.length; i ++) {
			var formField = formEl.elements[i];
			var checkedType = formField.type.match (/^(?:radio|checkbox)$/);
			if ((checkedType && formField.checked) || !checkedType) {
				formData[formField.name] = formField.value;
			}
		}
		// console.log (formData);
		return formData;
	}

	CuWireExt.prototype.selectBoardMod = function (boardId, platformName) {
		var boardMeta = this.platforms[platformName].boards[boardId];
		console.log (boardMeta);
		if (!("models" in boardMeta)) {
			this.setBoard (boardId, platformName);
			return;
		}

		this.showBoardInfo (boardId, platformName);
	}

	CuWireExt.prototype.getBoardImage = function (boardId, platformName) {
		var boardMeta = this.platforms[platformName].boards[boardId];
		var boardImageUrl = require.toUrl ('./assets/board-images/'+boardId+'.svg');

		boardMeta.imageUrl = boardImageUrl;

		var fs = brackets.getModule ("filesystem/FileSystem");
		var fileObj = fs.getFileForPath (boardImageUrl);

		fileObj.exists (function (err, exists) {
			if (err || !exists) {
				boardMeta.imageOk = null;
				return;
			}
			var bi = new Image ();
			bi.addEventListener ('load',  function () {
//				console.log ('board image load done', arguments);
				boardMeta.imageOk = true;
			}, false);
			bi.addEventListener ('error', function () {
				console.log ('board image file found, but got error on loading', arguments);
				boardMeta.imageOk = null;
			}, false);
			bi.addEventListener ('abort', function () {
				console.log ('board image file found, but got error on loading', arguments);
				boardMeta.imageOk = null;
			}, false);
			bi.src = encodeURI (boardImageUrl);
		})
	}

	CuWireExt.prototype.showRuntimeDialog = function (folders, modernRuntimesCount, rawFolders) {

		var message = runtimeSelectRenderer ({
			runtime: folders,
			noRuntimes: modernRuntimesCount === 0,
			manyRuntimes: modernRuntimesCount > 1,
		});

		console.log (
			"runtime:", JSON.stringify (rawFolders, null, "\t"),
			"modernRuntimesCount:", modernRuntimesCount
		);

		Dialogs.showModalDialog (
			"cuwire-runtime-select",
			"Runtime issue:",
			message,
			[{
				className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
				id: "select",
				text: "Select runtime location"
			}, {
				className: Dialogs.DIALOG_BTN_CANCEL,
				id: "cancel",
				text: "Cancel"
			}]
		).done((function (buttonId) {
//			var buttonMatch = buttonId.match (/cuwire-sketch-(\d+)/);
			if (buttonId === "select") {
				this.showSettings ();
				return;
			}
			// TODO: handle buttons and store runtimeFolder option.
			// then provide options.runtimeFolder to compiler and uploader
		}).bind (this));

	}

	CuWireExt.prototype.getBoardMeta = function () {
		// TODO: show spinner indicator

		var self = this;

		this.runtimes = [];

		delete this.runtime;

		// TODO: author's module location - use preferences for this
		// TODO: when we can't find arduino ide in default locations gracefully degrade
		// TODO: add support for energia
		var locations = [];
		if (prefs.get ('arduino-ide')) {
			locations.push (prefs.get ('arduino-ide'));
		}
//		if (prefs.get ('energia-ide')) {
//			locations.push (prefs.get ('energia-ide'));
//		}

		var options = {
			debug: true

		};

		this.domain.exec("getHardware", locations, [], options)
		.done(function (cuwireData) {
			var platforms = cuwireData[0];
			var folders   = cuwireData[1];

			var modernRuntimesCount = 0;

			var dialogData = Object.keys (folders).filter (function (folderName) {
				if (folders[folderName].runtime) {
					return true;
				}
			}).map ((function (folderName) {
				if (folders[folderName].modern) {
					self.runtime = folders[folderName].modern;
					modernRuntimesCount ++;
				}
				self.runtimes.push (folders[folderName]);
				return {
					folder:         folderName,
					readableFolder: folderName.replace (/\/Contents(?:\/Resources)?\/Java/, ""),
					runtime:        folders[folderName].runtime,
					modern:         folders[folderName].modern
				}
			}).bind (this));

			if (modernRuntimesCount !== 1) {
				self.showRuntimeDialog (dialogData, modernRuntimesCount, folders);
			}

			window.hwkv = self.platforms = platforms;
			self.boardUSBMatch = {};

			$('#cuwire-panel ul.cuwire-board li').remove();
			// tr = $('<tr />').appendTo('#cuwire-panel tbody');
			var cuwireBoardDD = $('#cuwire-panel ul.cuwire-board');

			if (self.verbose) {
				console.log("[brackets-cuwire-node]", "Available boards:", Object.keys (platforms).join (', '));
			}

			Object.keys (platforms).sort().forEach (function (platformName) {
				if (!platforms.hasOwnProperty(platformName)) return;
				if (!platforms[platformName].platform) {
					console.error ("not a platform:", platformName);
					return;
				}
				// console.log (platformName);
				$('<li class="dropdown-header">'
				  + platforms[platformName].platform.name + " "
				  + platforms[platformName].platform.version
				  + "</li>").appendTo(cuwireBoardDD);

				var boards = platforms[platformName].boards;
				Object.keys (boards).sort().map (function (boardId) {
					var boardMeta = boards[boardId];
					if (!boards.hasOwnProperty(boardId)) return;
					if (!boards[boardId].name) {
						console.error ("not a board:", boardId);
						return;
					}

					var boardUSBDesc = {
						platform: platformName,
						board:    {
							id: boardId,
							name: boardMeta.name
						}
					};

					var usbIdIdx = 0;
					while (boardMeta["vid."+usbIdIdx]) {
						var usbPair = [boardMeta["vid."+usbIdIdx], boardMeta["pid."+usbIdIdx]].join (':');
						if (self.boardUSBMatch[usbPair]) {
							self.boardUSBMatch[usbPair].alt[boardId] = boardUSBDesc;
						} else {
							self.boardUSBMatch[usbPair] = boardUSBDesc;
							self.boardUSBMatch[usbPair].alt = {};
						}
						usbIdIdx ++;
					}

					self.getBoardImage (boardId, platformName);

					var boardItem = $('<li><a href="#">'+boardMeta.name+"</a></li>");
					boardItem.appendTo(cuwireBoardDD);
					boardItem.on ('click', self.selectBoardMod.bind (self, boardId, platformName));

					var boardDesc = boardMeta.name + ' (' + boardId

					if ("models" in boardMeta) {
						boardDesc += ', models: ';
						var variants = [];
						boardMeta.mods = [];


						for (var modType in boardMeta.models) {
							// TODO: use description from arduino menu
							var modDesc = {
								typeTitle: boardMeta.menuNames[modType] || modType,
								typeId:    modType,
								modList:   [],
							};

							variants.push (modType+':');
							var idx = 0;
							for (var mod in boardMeta.models[modType]) {
								var modTitle = boardMeta.models[modType][mod][""];
								variants.push (modTitle);
								modDesc.modList.push ({modTitle: modTitle, modId: mod, index: idx});
								idx++;
							}
							boardMeta.mods.push (modDesc);
						}


						boardDesc += variants.join (" ");

					}
					boardDesc += ')';
					if (self.verbose)
						console.log (boardDesc, boardMeta);


				});
			});

			localStorage.boardUSBMatch = JSON.stringify (self.boardUSBMatch);

			self.setBoard();
		}).fail(function (err) {
			// TODO: show error indicator
			console.error("[brackets-cuwire-node] failed to run cuwire.getBoardMeta, error:", err);
		});

	}

	CuWireExt.prototype.changeStatusLabel = function (message, status) {
		var msgWrapperDiv = document.querySelector ('#cuwire-panel .process-state div.message-wrapper');
		msgWrapperDiv.classList.remove ("success", "failure", "running");
		msgWrapperDiv.classList.add (status);
		msgWrapperDiv.children[0].textContent = message;
	}

	CuWireExt.prototype.compileOrUpload = function (mode) {
		var boardMeta = prefs.get ('board');

		if (!boardMeta) {
			Dialogs.showModalDialog (
				'',
				'Board not defined',
				'Please select board using dropdown in cuwire panel'
			).done (function () {

			});
			return;
		}

		var boardId      = boardMeta[0];
		var platformName = boardMeta[1];
		var boardMod     = boardMeta[2];
		var options      = {};

		if (mode === 'upload') {
			options.serial = {
				port: prefs.get ('port').name
			};
		}

		options.includes = prefs.get ('includes');

		var currentDoc = DocumentManager.getCurrentDocument();

		this.changeStatusLabel ('Running', 'running');

		// cleanup log before next compile
		$('#cuwire-panel .table-container table tbody tr').remove();

		this.findSketchFolder ((function (err, folder, baudrate) {

			var domainRunner = this.compileOrUploadRunDomain.bind (this, mode, folder, platformName, boardId, boardMod, options, baudrate);

			// TODO: add preference to disable this behaviour
			if (mode === "upload") {
				this.domain.exec ("closeSerialPort", [
					options.serial.port
				]).done (
					domainRunner
				);
			} else {
				domainRunner();
			}
		}).bind (this));
	}

	CuWireExt.prototype.compileOrUploadRunDomain = function (mode, folder, platformName, boardId, boardMod, options, baudrate) {
		this.domain.exec (mode, [
			folder,
			platformName,
			boardId,
			boardMod || {},
			options || {}
		])
		.done ((function (size) {

			this.changeStatusLabel (mode === 'upload' ? 'Uploaded!' : 'Compiled!', 'success');

			localStorage.cuwireBaudrate = baudrate;

		}).bind (this)).fail ((function (error) {

			this.changeStatusLabel ('Failed', 'failure');

//			console.log (error);
		}).bind (this));
	}

	function getRelativeFilename(basePath, filename) {
		if (!filename || filename.substr(0, basePath.length) !== basePath) {
			return;
		}

		return filename.substr(basePath.length);
	}

	function searchForBaudrate (contents) {
		var m = contents.match (/Serial\.begin\s*\((\d+)\)/);
		if (m) {
			return m[1];
		}
	}

	CuWireExt.prototype.findSketchFolder = function (cb) {
		var error;
		ProjectManager.getAllFiles (function (fileName) {
			// searching for ino/pde only
			if (fileName.fullPath.match (/\.(ino|pde)$/))
				return true;
			return false;
		}).done (function (fileList) {

			if (!fileList.length) {
				error = 'cannot find .ino or .pde files within current project';
				cb (error);
				return;
			}

			// only one sketch within project dir, do it!
			if (fileList.length === 1) {
				fileList[0].read (function (err, contents, stat) {
					var sketchFolderPath = fileList[0].parentPath;
					cb (null, sketchFolderPath, searchForBaudrate (contents));
				})
				return;
			}

			var projectRoot = ProjectManager.getProjectRoot();

			// selected file and current document can be different, so check context for both
			var selectedFile = ProjectManager.getSelectedItem();
			if (selectedFile) {
				var selectedFilePath = selectedFile.fullPath;
			}
			var currentDoc   = DocumentManager.getCurrentDocument();
			if (currentDoc) {
				var openedFile   = currentDoc.file;
				var openedFilePath = openedFile.fullPath;
			}

			// console.log (getRelativeFilename (projectRoot.fullPath, selectedFile.fullPath, openedFile.fullPath));

			var currentSketch;

			fileList.every (function (inoFile) {
				var sketchFolderPath = inoFile.parentPath;

				if (openedFile && getRelativeFilename (sketchFolderPath, openedFilePath)) {
					currentSketch = openedFile;
					return false;
				} else if (selectedFile && getRelativeFilename (sketchFolderPath, selectedFilePath)) {
					currentSketch = selectedFile;
					return false;
				}
				return true;
			});

			if (currentSketch) {
				// we have selected or opened file somewhere within sketch tree
				currentSketch.read (function (err, contents, stat) {
					var sketchFolderPath = currentSketch.parentPath;
					cb (null, sketchFolderPath, searchForBaudrate (contents));
				});
				return;
			}

			var dialogData = fileList.sort().map (function (fileObject, fileObjectIdx) {
				var sketchFolderPath = fileObject.parentPath.replace (/\/$/, "");
				var sketchFolder = sketchFolderPath.substr (sketchFolderPath.lastIndexOf ('/') + 1);
				var relativePath = getRelativeFilename (projectRoot.fullPath, sketchFolderPath);
				return {
					index: fileObjectIdx,
					folder: sketchFolder,
					relativePath: relativePath
				};
			});

			// TODO: draw a dialog with buttons to handle this
			var message = sketchSelectRenderer ({
				sketch: dialogData
			});

			Dialogs.showModalDialog (
				"cuwire-sketch-select",
				"Please select sketch:",
				message
			).done(function (buttonId) {
				var buttonMatch = buttonId.match (/cuwire-sketch-(\d+)/);
				if (!buttonMatch) {
					// don't care about another buttons
					return;
				}

				var sketchIdx = parseInt (buttonMatch[1]);

				fileList[sketchIdx].read (function (err, contents, stat) {
					var sketchFolderPath = fileList[sketchIdx].parentPath;
					cb (null, sketchFolderPath, searchForBaudrate (contents));
				})

			});

		});

	}

	CuWireExt.prototype.showSettings = function () {

		var messageData = {
			"arduinoIDE": prefs.get ('arduino-ide'),
			"energiaIDE": prefs.get ('energia-ide'),
			"verbose":    prefs.get ('verbose')
		};

		var message = settingsRenderer (messageData);

		var formData = {};

		var dlg = Dialogs.showModalDialog (
			'cuwire-settings',
			"cuwire settings", // title
			message // dialog body
			// buttons, by default ok button
			// autodismiss, true by default
		).done ((function (buttonId) {
			if (buttonId === "ok") {
				console.log (formData);
				// CommandManager.execute("debug.refreshWindow");
				prefs.set ('arduino-ide', formData.arduinoIDE);
				prefs.set ('energia-ide', formData.energiaIDE);

				this.verbose = "verbose" in formData;
				prefs.set ('verbose', this.verbose);

				this.getBoardMeta ();
			}
		}).bind (this));

		var theBoard = this.board;

		var locationSelect = $("#cuwire-settings-panel a.location.btn");
		locationSelect.on ('click', function (evt) {
			var inputWrapper = evt.currentTarget.parentNode;
			FileSystem.showOpenDialog (
				false, // allowMultipleSelection,
				navigator.platform === "MacIntel" ? false : true, // chooseDirectories,
				inputWrapper.querySelector('label').textContent, // title,
				null, // initialPath,
				null, // fileTypes,
				function (err, fileList) {
					var inputEl = inputWrapper.querySelector('input');
					if (fileList.length === 1) {
						inputEl.value = fileList[0];
						formData = getFormFields (inputEl.form);
					}
				}.bind (this)
			);
		}.bind (this));

		var boardPrefInputs = $("#cuwire-settings-panel input");
		// WTF: there is little delay between actual rendering and request to create an dom nodes
		// setTimeout (function () {
			boardPrefInputs = $("#cuwire-settings-panel input");
			var formEl = boardPrefInputs[0].form;

			setFormFields (formEl, messageData);

			formData = getFormFields (formEl);

		// }, 100);

		boardPrefInputs.on ('input', function() {
			var formEl = $(this)[0].form;
			formData = getFormFields (formEl);
		});

//		$settings.find("#markdown-preview-format")
//		.prop("selectedIndex", _prefs.get("useGFM") ? 1 : 0)
//		.change(function (e) {
//			_prefs.set("useGFM", e.target.selectedIndex === 1);
//			_updateSettings();
//		});
	}

	CuWireExt.prototype.showSerialMonitor = function () {
		var serialMonUrl = ExtensionUtils.getModuleUrl (module, "serial-monitor/main").replace ('main', 'index.html');
		var serialPort = prefs.get ('port');

		serialMonUrl += '?' + 'bracketsIndexPath=' + encodeURIComponent (location.pathname);
		if (serialPort && serialPort.name) {
			serialMonUrl += '&' + 'serialPort=' + encodeURIComponent (serialPort.name);
		}

		var serialWindow = window.open (serialMonUrl, "brackets-cuwire-serial", "width=" + 1000 + ",height=" + 500);
	}


	CuWireExt.prototype.createUI = function (require) {

		var myIcon = $("<a href=\"#\" id=\"cuwire-sidebar-icon\"></a>");

		myIcon.appendTo($("#main-toolbar .buttons"));

		this.panel = WorkspaceManager.createBottomPanel (moduleId+".panel", $(require('text!bottom-panel.html')), 190);

		this.enumerateSerialPorts ();
		this.getBoardMeta ();

		this.verbose = prefs.get ('verbose');

		this.panel.toggle = function () {
			if (this.isVisible ()) {
				this.hide ();
			} else {
				this.show ();
			}
			stateManager.set ('panelVisibility', this.isVisible());
		}

		var lastPanelState = stateManager.get ('panelVisibility');
		this.panel.setVisible (lastPanelState);

		myIcon.on ("click", this.panel.toggle.bind (this.panel));
		// we call toggle because you cannot click on close button on hidden panel
		$('#cuwire-panel .close').on('click', this.panel.toggle.bind (this.panel));

		var titleButton = $('#cuwire-panel button.cuwire-board');
		titleButton.on ('click', this.showBoardInfo.bind (this, null, null));

		var portButton = $('#cuwire-panel button.cuwire-port');
		portButton.on ('click', this.showSerialMonitor.bind (this, null, null));

		var compileButton = $('#cuwire-panel button.cuwire-compile');
		compileButton.on ('click', this.compileOrUpload.bind (this, "compile"));

		var uploadButton = $('#cuwire-panel button.cuwire-upload');
		uploadButton.on ('click', this.compileOrUpload.bind (this, "upload"));

		var settingsButton = $('#cuwire-panel button.cuwire-settings');
		settingsButton.on ('click', this.showSettings.bind (this));

		this.domain.on ('log', this.logger.log.bind (this.logger));

		this.domain.on ('error', this.logger.logError.bind (this.logger));
	}


	app.appReady(function(){
		//		$(brackets.getModule('document/DocumentManager')).on('documentSaved', onDocumentSaved);

		var cuwireExt = new CuWireExt (require, cuwireDomain);
	});

});
