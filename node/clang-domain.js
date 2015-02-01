(function () {
	"use strict";

	var os   = require("os");
	var fs   = require('fs');
	var path = require ('path');

	var _domainManager;

	var ClangProject = require ('./clang-project.js');

	var projects = {};

	// probably best time to init cuwire projects — at brackets project open
	//

	/**
	 * initialize project
	 * @param {String} projectRoot project root
	 */
	function initProject (projectRoot) {
		// actually we can have multiple arduino/... projects within brackets project,
		// so we store each project handle
		projects[projectRoot] = {
			clang: new ClangProject (projectRoot),
			cuwire: null
		};
		// 1) get project real dir and build dir
		// 2) call cuwire context if we have a mcu project
		// 3) call gcc via clang to determine defines (assume we have clang without AVR support)
		// 4) prepare project, but compile
	}

	function closeProject (projectRoot) {

	}

	/**
	 * get function names for file
	 * @param {String} fileName file name to gather function names
	 */
	function getFunctionNames (fileName) {
		// 1) get project instance
		// 2) call clang project method
	}

	/**
 	* get a completions list for position in file
 	* @param {String} fileName path to source file name
 	* @param {Number} line     line number
 	* @param {Number} column   column number
 	*/
	function getCompletionAt (fileName, line, column) {
		// 1) get project instance
		// 2) call clang project method
	}

	function getFunctionLocations (functionName) {
		// 1) get project instance
		// 2) call clang project method
	}


	var domainName = "clang";

	/**
	* Initializes the domain
	* @param {DomainManager} domainManager The DomainManager for the server
	*/
	function init(domainManager) {
		if (!domainManager.hasDomain(domainName)) {
			domainManager.registerDomain(domainName, {major: 0, minor: 1});
		}
		_domainManager = domainManager;
		domainManager.registerCommand(
			domainName,       // domain name
			"initProject",    // command name
			initProject,   // command handler function
			true,          // this command is asynchronous in Node
			"Initialize project",
			[],
			[{name: "ports", // return values
			  type: "array",
			  description: "serial port path names"}]
		);
		domainManager.registerCommand(
			domainName,       // domain name
			"getFunctionNames",    // command name
			getFunctionNames,   // command handler function
			true,          // this command is asynchronous in Node
			"get function names",
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
			domainName,       // domain name
			"getFunctionLocations",    // command name
			getFunctionLocations,   // command handler function
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
			domainName,       // domain name
			"getCompletionAt",    // command name
			getCompletionAt,   // command handler function
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
		domainManager.registerEvent(
			domainName,     // domain name
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
			domainName,     // domain name
			"serialMessage",         // event name
			[{
				name: "message",
				type: "string",
				description: "message"
			}]
		);
	}

	exports.init = init;

}());
