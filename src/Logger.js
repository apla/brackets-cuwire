define(function (require, exports, module) {
	"use strict";

	var BracketsTools = require ('./BracketsTools');

	function Logger () {

	}

	Logger.prototype.log = function (event, scope, message, payload) {
		if (payload && payload.maxText) {
			this.updateUsedResources(payload);
		} else if (message.match (/^done(?:\s|$)/)) {
			var highlight = 'done';
		}
		this.appendMessage (scope, highlight, message);
	}

	Logger.prototype.logError = function (event, scope, message, payload) {
		if (payload && payload.files && payload.files.length) {
			this.showSourceLocation (scope, "error", payload);
		} else if (payload && ("stderr" in payload)) {
			this.showStdErr (scope, "error", payload);
		} else if (payload && payload.code) {
			this.showFSError (scope, "error", payload);
		}
	}

	Logger.prototype.appendMessage = function (scope, highlight, message, payload) {
		if (message.constructor !== Array) {
			message = [message];
		}
		message.forEach (function (m) {
			var mInline = m;
			if (m.error) {
				mInline = [m.file, m.line, m.ch].join (':') + ' <b>'+m.error+'</b>';
			}
			var domTableRow = $("<tr class=\""+highlight+"\"><td>"+scope+"</td><td>"+mInline+"</td></tr>");
			$('#cuwire-panel .table-container table tbody').append (domTableRow);
			if (m.error) {
				domTableRow.on ('click', BracketsTools.jumpToFile.bind (BracketsTools, [payload.sketchFolder, m.file], m.line - 1, m.ch - 1));
			}
		});

		var scrollableContainer = $('#cuwire-panel .table-container')[0];
		setTimeout (function () {
			scrollableContainer.scrollTop = scrollableContainer.scrollHeight;
		}, 0);
	}

	Logger.prototype.showSourceLocation = function (scope, highlight, payload) {
		var message = ["compilation failed. command: " + payload.cmd];
		// console.log (paint.cuwire(), 'compilation failed:')
		payload.files.forEach (function (fileDesc) {
			message.push ({file: fileDesc[1], line: fileDesc[2], ch: fileDesc[3] || 1, error: fileDesc[4]});
		});

		this.appendMessage (scope, highlight, message, payload);
	}

	Logger.prototype.showStdErr = function (scope, highlight, payload) {
		var message = payload.stderr || payload.cmd;

		this.appendMessage (scope, highlight, message);
	}

	Logger.prototype.showFSError = function (scope, highlight, payload) {
		var message;

		if (payload.code === "ENOENT") {
			message = "File not found: " + payload.path;
		}

		this.appendMessage (scope, highlight, message);

	}

	function percentageDegrees (p) {
		p = (p >= 100 ? 100 : p);
		var d = 3.6 * p;
		return d;
	};

	function createGradient (elemPie, elemValue, elemMax, value, max) {
		var p = Math.round (value / (max || value) * 100);
		var d = percentageDegrees (p);
		if (d <= 180) {
			d = 90 + d;
			elemPie.css ('background', 'linear-gradient(90deg, #2c3e50 50%, transparent 50%), linear-gradient('+ d +'deg, #2ecc71 50%, #2c3e50 50%)');
		} else {
			d = d - 90;
			elemPie.css ('background', 'linear-gradient(-90deg, #2ecc71 50%, transparent 50%), linear-gradient('+ d +'deg, #2c3e50 50%, #2ecc71 50%)');
		}
		elemPie.attr ('data-percentage', p);
		elemPie.text (p + '%');
		elemValue.text (value);
		elemMax.text (max || 'n/a');
	}

	Logger.prototype.updateUsedResources = function (payload) {
		createGradient (
			$('.pie.pie-text'),
			$('.pie-label.pie-text .value'),
			$('.pie-label.pie-text .full'),
			payload.text,
			payload.maxText
		);
		createGradient (
			$('.pie.pie-data'),
			$('.pie-label.pie-data .value'),
			$('.pie-label.pie-data .full'),
			payload.data,
			payload.maxData
		);
	}

	return Logger;
});
