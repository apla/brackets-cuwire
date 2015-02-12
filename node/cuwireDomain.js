/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, node: true */
/*global */

(function () {
	"use strict";

	var os   = require("os");
	var fs   = require('fs');
	var path = require ('path');

	var _domainManager;

	var CuWireData     = require ('cuwire/data');
	var CuWireCompiler = require ('cuwire/compiler');
	var CuWireUploader = require ('cuwire/uploader');

	var CuWireSerial   = require ('./cuwireSerialBrackets');

	var theCuWire;

	function getBoardsMeta (runtimeFolders, sketchesFolder, options) {

		var cb = arguments[arguments.length-1];

//		if (!theCuWire) {
			theCuWire = new CuWireData (runtimeFolders, sketchesFolder, true, options);

			theCuWire.on ('done', function () {
//				console.log (theCuWire.folders);
				cb (null, [theCuWire.boardData, theCuWire.folders, theCuWire.hardware]);
			});
//		} else {
//			cb (null, theCuWire.boardData);
//		}
	}

	function cuwireBoardsDone (cb, boards) {
		fs.writeFile (
			path.join (__dirname, "../cuwire.json"),
			JSON.stringify (boards, null, '\t'),
			function (err) {
				if (err) {
					cb (err);
				}
				cb (null, boards);
			});
	}

	var compileFirstRun = true;

	function compile (params) {
		var sketchFolder    = params.shift ();
		var platformName    = params.shift ();
		var boardId         = params.shift ();
		var boardMod        = params.shift ();
		var options         = params.shift ();

		var cb = arguments[arguments.length-1];

		if (!theCuWire) {
			// show error
			// cb
			return;
		}

		var compiler = new CuWireCompiler (
			// "sketch" folder
			sketchFolder,
			// platform name
			platformName,
			// board id
			boardId,
			// boardVariation (e.g. cpu menu selection)
			boardMod || {},
			// options (e.g. custom build folder)
			options || {
				// build folder
				// buildFolder: "/Users/apla/tmp/cuwire-build"
			}
		);

		compiler.on ('done', function (size) {
//			console.log ('cuwire domain: compiled', arguments);
			cb ();
		});

		compiler.on ('log', function (scope, message, payload) {
//			console.log (scope, message, payload);
			_domainManager.emitEvent ('cuwire', 'log', [scope, message, payload]);
		});

		compiler.on ('error', function (err) {
//			console.log ('error', err);
			_domainManager.emitEvent ('cuwire', 'log', [err.scope, err.toString(), err]);
			cb (err);
		});

	}

	function upload (params) {
		var sketchFolder    = params.shift ();
		var platformName    = params.shift ();
		var boardId         = params.shift ();
		var boardMod        = params.shift ();
		var options         = params.shift ();

		var cb = arguments[arguments.length-1];

		if (!theCuWire) {
			// show error
			// cb
			return;
		}

		var compiler = new CuWireCompiler (
			// "sketch" folder
			sketchFolder,
			// platform name
			platformName,
			// board id
			boardId,
			// boardVariation (e.g. cpu menu selection)
			boardMod || {},
			// options (e.g. custom build folder)
			options || {
				// build folder
				// buildFolder: "/Users/apla/tmp/cuwire-build"
			}
		);

		compiler.on ('done', function (size) {
			console.log ('cuwire domain: compiled', arguments);
			var uploader = new CuWireUploader (
				// "sketch" folder
				compiler,
				// platform name
				platformName,
				// board id
				boardId,
				// boardVariation (e.g. cpu menu selection)
				boardMod || {},
				// options (e.g. custom build folder)
				options || {
					// build folder
					// buildFolder: "/Users/apla/tmp/cuwire-build"
				}
			);

			uploader.on ('done', function (size) {
//				console.log ('cuwire domain: uploaded', arguments);
				cb();
			});

			uploader.on ('log', function (scope, message, payload) {
				console.log (scope, message, payload);
				_domainManager.emitEvent ('cuwire', 'log', [scope, message, payload]);
			});

			uploader.on ('error', function (err) {
//				console.log ('error', err);
				_domainManager.emitEvent ('cuwire', 'log', [err.scope, err.toString(), err]);
				cb (err);
			});
		});

		compiler.on ('log', function (scope, message, payload) {
			console.log (scope, message, payload);
			_domainManager.emitEvent ('cuwire', 'log', [scope, message, payload]);
		});

		compiler.on ('error', function (err) {
			console.log ('error', err);
			_domainManager.emitEvent ('cuwire', 'log', [err.scope, err.toString(), err]);
			cb (err);
		});

	}

	function echo (message) {
		var cb = arguments[arguments.length-1];
		cb (null, message);
	}

	var serialComms = {};

	/**
	 * function to enumerate serial ports
	 * @return {array} path names
	 */
	function enumerateSerialPorts () {
//		console.log (os);

		var cb = arguments[arguments.length-1];

		// https://github.com/voodootikigod/node-serialport
		// HOWTO built THAT on mac (got idea from https://github.com/jasonsanjose/brackets-sass/tree/master/node):
		// 1) cd <extension-folder>/node; npm install node-gyp node-pre-gyp serialport
		// 2) cd node_modules/serialport
		// 3) /Applications/devel/Brackets.app/Contents/MacOS/Brackets-node ../../node_modules/node-pre-gyp/bin/node-pre-gyp --arch=ia32 rebuild

		// current binaries got from http://node-serialport.s3.amazonaws.com

		var err, result = [];
		CuWireSerial.list (function (err, ports) {
			if (err)
				return cb(err);
			ports.forEach (function (port) {
				result.push ({
					name:         port.comName,
					manufacturer: port.manufacturer,
					vendorId:     port.vendorId,
					productId:    port.productId,
					serialNumber: port.serialNumber,
					connected:    (port.comName in serialComms) ? true : false
				});
			});

			cb (err, result);
		});

//		var SerialPort = serialport.SerialPort;
//		var serialPort = new SerialPort("/dev/tty-usbserial1", {
//			baudrate: 57600
//		});

	}

	function openSerialPort (params) {
		var cb       = arguments[arguments.length - 1];
		var port     = params.shift();
		var baudrate = params.shift();

		var portName = port;
		if (port && port.name) {
			portName = port.name;
		}

		// TODO: need to make decision
		// 1) support multiple serial connections
		// 2) only one connection, close previous before connecting to new one
		// for now, only one port is supported
		closeSerialPort ();

		var cuwireSerial = new CuWireSerial.brackets ();
		cuwireSerial.on ('data', _domainManager.emitEvent.bind (_domainManager, 'cuwire', 'serialMessage'));

		cuwireSerial.on ('error', (function (err) {
			delete serialComms[portName];
			console.log ('serial port error');
			_domainManager.emitEvent ('cuwire', 'serialPortClose', err);
		}).bind (this));

		cuwireSerial.on ('close', (function (err) {
			delete serialComms[portName];
			console.log ('serial port is closed');
			_domainManager.emitEvent ('cuwire', 'serialPortClose', err);
		}).bind (this));

		cuwireSerial.open (portName, baudrate, cb);

		serialComms[portName] = cuwireSerial;
	}

	function closeSerialPort (params) {
		var cb = arguments[arguments.length - 1];
		for (var portName in serialComms) {
			if (params && params[0] && (params[0].name ? params[0].name !== portName : params[0] !== portName)) {
				continue;
			}

			var cuwireSerial = serialComms[portName];
			if (!cuwireSerial)
				continue;
			cuwireSerial.close (function (error) {
				// I don't care about closing errors for now
			});
			delete serialComms[portName];
		}
		cb && cb ();
	}

	function sendMessageSerial (params) {
		var cb = arguments[arguments.length - 1];
		var port    = params.shift();
		var message = params.shift();
		if (port && port.name) {
			port = port.name;
		}
		console.log (port, message);
		if (port in serialComms) {
			console.log ("port found");
			var cuwireSerial = serialComms[port];
			cuwireSerial.send (message);
		} else {
			cb && cb (new Error ('no such port'));
		}
		cb && cb ();
	}

	/**
	* Initializes the domain
	* @param {DomainManager} domainManager The DomainManager for the server
	*/
	function init(domainManager) {
		if (!domainManager.hasDomain("cuwire")) {
			domainManager.registerDomain("cuwire", {major: 0, minor: 1});
		}
		_domainManager = domainManager;
		domainManager.registerCommand(
			"cuwire",       // domain name
			"echo",    // command name
			echo,   // command handler function
			true,          // this command is asynchronous in Node
			"Simple echo function",
			[{name: "message",
			 type: "string",
			 description: "message"}],
			[{name: "echo", // return values
			  type: "string",
			  description: "echoed message"}]
		);
		domainManager.registerCommand(
			"cuwire",       // domain name
			"enumerateSerialPorts",    // command name
			enumerateSerialPorts,   // command handler function
			true,          // this command is asynchronous in Node
			"Enumerate all serial ports",
			[],
			[{name: "ports", // return values
			  type: "array",
			  description: "serial port path names"}]
		);
		domainManager.registerCommand(
			"cuwire",       // domain name
			"openSerialPort",    // command name
			openSerialPort,   // command handler function
			true,          // this command is asynchronous in Node
			"Connect to a serial port",
			[{
				name: "port",
				type: "string",
				description: "port name/path"
			}, {
				name: "baudrate",
				type: "int",
				description: "port baudrate"
			}],
			[]
		);
		domainManager.registerCommand(
			"cuwire",       // domain name
			"closeSerialPort",    // command name
			closeSerialPort,   // command handler function
			true,          // this command is asynchronous in Node
			"Close a serial port",
			[{
				name: "port",
				type: "string",
				description: "port name/path"
			}],
			[]
		);
		domainManager.registerCommand(
			"cuwire",       // domain name
			"sendMessageSerial",    // command name
			sendMessageSerial,   // command handler function
			true,          // this command is asynchronous in Node
			"Send message to a serial port",
			[{
				name: "port",
				type: "string",
				description: "port name/path"
			}, {
				name: "message",
				type: "string",
				description: "message to send to port"
			}],
			[]
		);
		domainManager.registerCommand(
			"cuwire",       // domain name
			"getBoardsMeta",    // command name
			getBoardsMeta,   // command handler function
			true,          // this command is asynchronous in Node
			"get cuwire boards metadata",
			[{
				name: "customRuntimeFolders",
				type: "array",
				description: "folders for a runtime search"
			}, {
				name: "customSketchesFolder",
				type: "array",
				description: "folders for a sketches search"
			}],
			[{
				name: "arduinoData", // return values
				type: "object",
				description: "board data"
			 }]
		);
		domainManager.registerCommand(
			"cuwire",     // domain name
			"compile",     // command name
			compile,       // command handler function
			true,          // this command is asynchronous in Node
			"compile current sketch",
			[{
				name: "sketchFolder",
				type: "string",
				description: "sketch folder, contains .ino or .pde file"
			}, {
				name: "platformName",
				type: "string",
				description: "cuwire platform name"
			}, {
				name: "boardId",
				type: "string",
				description: "board identifier"
			}, {
				name: "boardMod",
				type: "object",
				description: "board modification"
			}, {
				name: "options",
				type: "object",
				description: "options, like includes"
			}],
			[{name: "size", // return values
			  type: "object",
			  description: "compiled code size"}]
		);
		domainManager.registerCommand(
			"cuwire",     // domain name
			"upload",     // command name
			upload,       // command handler function
			true,          // this command is asynchronous in Node
			"compile then upload sketch",
			[{
				name: "sketchFolder",
				type: "string",
				description: "sketch folder, contains .ino or .pde file"
			}, {
				name: "platformName",
				type: "string",
				description: "cuwire platform name"
			}, {
				name: "boardId",
				type: "string",
				description: "board identifier"
			}, {
				name: "boardMod",
				type: "object",
				description: "board modification"
			}, {
				name: "options",
				type: "object",
				description: "options, like includes or upload port"
			}],
			[{name: "size", // return values
			  type: "object",
			  description: "compiled code size"}]
		);
		domainManager.registerEvent(
			"cuwire",     // domain name
			"log",         // event name
			[{
				name: "scope",
				type: "string",
				description: "message scope"
			}, {
				name: "message",
				type: "string",
				description: "log string"
			}, {
				name: "payload",
				type: "object",
				description: "log message payload"
			}]
		);
		domainManager.registerEvent(
			"cuwire",     // domain name
			"serialMessage",         // event name
			[{
				name: "message",
				type: "string",
				description: "message"
			}]
		);
		domainManager.registerEvent(
			"cuwire",     // domain name
			"serialPortClose",         // event name
			[{
				name: "error",
				type: "object",
				description: "error"
			}]
		);
	}

	exports.init = init;

}());
