var libclang = require('libclang');
var Index = libclang.Index;
var Cursor = libclang.Cursor;
var TranslationUnit = libclang.TranslationUnit;

var index = new Index(true, true);

// DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH:clang NODE_PATH=/Users/apla/work/mcu/brackets-cuwire/node/node_modules node walk-source.js  | less

//var source = "/var/folders/r4/d4l8c_ts4rsdc670pdkbtr0m0000gp/T/Sensor-cuwire-5358ae5d/Sensor.cpp";
var source = 'samples/sample2_l6c9.cc';

var tu = TranslationUnit.parse (
	index,
	source, [
		"-Wno-unknown-attributes",
		//		"-fsyntax-only",
//		"-nostdinc",
//		//		"-nostdlibinc",
//		//		"-nobuiltininc",
//		"-MMD",
//		"-xc++",
//		"-DF_CPU=16000000L",
//		"-DARDUINO=158",
//		"-DARDUINO_AVR_PRO",
//		"-DARDUINO_ARCH_AVR",
//		"-D__AVR_ATmega328P__",
//		"-D__AVR__",
//		"-I/Applications/devel/Arduino.app/Contents/Java/hardware/tools/avr/lib/gcc/avr/4.8.1/include/",
//		"-I/Applications/devel/Arduino.app/Contents/Java/hardware/tools/avr/avr/include/",
//		"-I/Applications/devel/Arduino.app/Contents/Java/hardware/arduino/avr/cores/arduino",
//		"-I/Applications/devel/Arduino.app/Contents/Java/hardware/arduino/avr/variants/eightanaloginputs",
//		"-I/Applications/devel/Arduino.app/Contents/Java/hardware/arduino/avr/libraries/Wire",
//		"-I/Applications/devel/Arduino.app/Contents/Java/hardware/arduino/avr/libraries/EEPROM",
//		"-I/Users/apla/Documents/Arduino/libraries/Time",
//		"-I/Users/apla/Documents/Arduino/libraries/DS3231RTC",
//		"-I/Users/apla/Documents/Arduino/libraries/EtherCard",
//		"-I/Users/apla/Documents/Arduino/libraries/JeeLib"
	], [], {
		incomplete: true,
		precompiledPreamble: true
	}
);

//console.log (Cursor);

//tu.codeCompleteAt (source, 6, 9);
tu.codeCompleteAt (source, 4, 1);

return;

tu.cursor.visitChildren(function (parent) {
	//	console.log (parent);
	//	if (this.spelling === "analogRead") {
	console.log (this.spelling, this.kind, this.location.presumedLocation);
	//	}
	switch (this.kind) {
		case Cursor.FunctionDecl:
			console.log('function', this.spelling, this.location.presumedLocation);
			// TODO: try/catch?
			var self = this;
			//			this.visitChildren (function (parent) {
			//				console.log ('function', self.spelling, 'has child', this.spelling);
			//			});
			//console.log('displayName', this.displayName);
			//			console.log (this);
			//			process.exit(0);
			break;
		case Cursor.MacroDefinition:
			//			console.log('macro', this.spelling);
			break;
		case Cursor.InclusionDirective:
			//			console.log('inclusion', this.spelling);
			break;
	}
	return Cursor.Continue;
});

index.dispose();
//tu.dispose();
