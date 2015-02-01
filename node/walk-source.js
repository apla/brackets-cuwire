var ClangProject = require ('./clang-project.js');

// DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH:clang NODE_PATH=/Users/apla/work/mcu/brackets-cuwire/node/node_modules node walk-source.js  | less

var args = [
	// libraries
	"-I/Applications/devel/Arduino.app/Contents/Java/hardware/arduino/avr/libraries/Wire",
	"-I/Applications/devel/Arduino.app/Contents/Java/hardware/arduino/avr/libraries/EEPROM",
	"-I/Users/apla/Documents/Arduino/libraries/Time",
	"-I/Users/apla/Documents/Arduino/libraries/DS3231RTC",
	"-I/Users/apla/Documents/Arduino/libraries/EtherCard",
	"-I/Users/apla/Documents/Arduino/libraries/JeeLib"
];

var sourceFileName = "/var/folders/r4/d4l8c_ts4rsdc670pdkbtr0m0000gp/T/Sensor-cuwire-5358ae5d/Sensor.cpp";

// TODO: use cuwire
var theProject = new ClangProject (args, {
	template: 'arduino',
	arduinoRuntime: "/Applications/devel/Arduino.app/Contents/Java"
});

console.log (theProject, theProject.prototype);

var sourceFileAST = theProject.parseFile (sourceFileName);

sourceFileAST.functionNames ();

sourceFileAST.completionAt (179, 1);

//var libclangTU = parse_libclang ();

//var arduinoSourceFile = "arduino-test-clang/test.cpp";
//
//var arduinoTestTU = parseArduinoTest (arduinoSourceFile);
//
//findAll (arduinoTestTU);
//
//arduinoTestTU.codeCompleteAt (arduinoSourceFile, 4, 1);


//return;

// index.dispose();
//tu.dispose();


function parse_libclang () {
	var index2 = new Index(true, true);

	var source2 = "/Users/apla/work/mcu/brackets-cuwire/clang+llvm-3.5.0-macosx-apple-darwin/include/clang-c/Index.h";

	var tu2 = TU.parse (
		index,
		source2, [
			'-I/Users/apla/work/mcu/brackets-cuwire/clang+llvm-3.5.0-macosx-apple-darwin/include/'
		], [], {
			incomplete: true,
			precompiledPreamble: true,
			skipFunctionBodies: true
		}
	);
	return tu2;
}
