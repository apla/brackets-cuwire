var util = require ('util');

var CuwireSerial = require ('cuwire/serial');

function CuwireSerialBrackets (options) {
}

util.inherits (CuwireSerialBrackets, CuwireSerial);

CuwireSerial.brackets = CuwireSerialBrackets;

var scope = "serial";

CuwireSerialBrackets.prototype.onOpen = function (sp, cb) {

	this.port = sp;

	// TODO: use 1k buffer for data with submission on over 1k, \n
	// or 50msec timeout

	this.port.on ('data', (function (buf) {
		this.emit ('data', buf.toString());
	}).bind(this));

	cb && cb ();
}

module.exports = CuwireSerial;
