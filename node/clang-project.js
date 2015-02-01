var libclang = require('libclang');

var Index  = libclang.Index,
	Cursor = libclang.Cursor,
	TU     = libclang.TranslationUnit;


function ClangProject (argv, options) {
	this.clangIndex = new Index(true, true);

	if (options && options.template === 'arduino') {
		var arduinoRuntime = options.arduinoRuntime;
		this.argv = [].concat ([
			"-Wno-unknown-attributes",
			"-Wno-attributes",
			//"-fsyntax-only", // ignored when parsing
			"-nostdinc",
			//"-nostdlibinc",
			//"-nobuiltininc",
			"-MMD", // does it helps?
			"-xc++",
			"-DF_CPU=16000000L", // some defines depends on it
			// probably not needed, but I'll include anyway
			"-DARDUINO=158",
			"-DARDUINO_AVR_PRO",
			"-DARDUINO_ARCH_AVR",
			"-D__AVR_ATmega328P__",
			"-D__AVR__",
			// stdinc
			'-I'+arduinoRuntime+'/hardware/tools/avr/lib/gcc/avr/4.8.1/include/',
			'-I'+arduinoRuntime+'/hardware/tools/avr/avr/include/',
			// core
			'-I'+arduinoRuntime+'/hardware/arduino/avr/cores/arduino/',
			// variant
			'-I'+arduinoRuntime+'/hardware/arduino/avr/variants/eightanaloginputs/',
		], argv);
	} else {
		this.argv = argv;
	}
}

ClangProject.prototype.lookPreprocessorDefines = function () {
	// TODO: match those defines from -mmcpu
	// TODO: parse https://github.com/embecosm/avr-gcc/blob/1fff0f74ab020fbfed8740079d03ac06919a5f44/gcc/config/avr/avr-mcus.def

	// even better way: echo | gcc -dM -E -
	// from http://stackoverflow.com/questions/2224334/gcc-dump-preprocessor-defines

	// for a mapping -march => define __AVR_AT***__
	// MORE: https://gcc.gnu.org/onlinedocs/gcc/AVR-Options.html

}


ClangProject.prototype.lookPreprocessorIncludes = function () {
	//`gcc -print-prog-name=cc1plus` -v
	//This command asks gcc which C++ preprocessor it is using, and then asks that preprocessor where it looks for includes.
	//
	//You will get a reliable answer for your specific setup.
	//
	//Likewise, for the C preprocessor:
	//
	//`gcc -print-prog-name=cc1` -v
	//http://stackoverflow.com/questions/344317/where-does-gcc-look-for-c-and-c-header-files
}

ClangProject.prototype.parseFile = function (sourceFile, unsavedFiles) {

	var tu = TU.parse (
		this.clangIndex,
		sourceFile,
		this.argv,
		unsavedFiles || [], {
			incomplete: true,
			precompiledPreamble: true,
			// never use this flag, return incorrect function extent end line
			// skipFunctionBodies: true
		}
	);
	return new SourceFile (sourceFile, tu);
}

ClangProject.prototype.dispose = function () {
	this.clangIndex.dispose();
}

function SourceFile (fileName, tu) {
	this.fileName = fileName;
	this.tu       = tu;
}

SourceFile.prototype.functionNames = function (localOnly) {
	var functionNames = {};

	// TODO: local only

	this.tu.cursor.visitChildren(function (parent) {
		switch (this.kind) {
			case Cursor.FunctionDecl:
				if (!this.isDefinition)
					return Cursor.Continue;
				if (localOnly && !this.location.isFromMainFile)
					return Cursor.Continue;
				var functionType = this.type.result.declaration.spelling;

				var args = [];
				var i, a;
				for (i = 0; i < this.type.argTypes; i++) {
					a = this.type.getArg(i);

					//console.error('mapping argument', i);
					args.push ([a.spelling, a.declaration.displayname]);
				}

				var functionExtent = this.extent;
				var start = functionExtent.start.presumedLocation;
				var end = functionExtent.end.presumedLocation;

				functionNames[this.spelling] = {
					location: this.location.presumedLocation,
					return: functionType || 'void',
					args: args,
					isMainFile: this.location.isFromMainFile,
					start: {
						line: start.line,
						column: start.column
					},
					end: {
						line: end.line,
						column: end.column
					}
				}

				//				console.log ('function', functionNames[this.spelling]);

				// TODO: try/catch?
				var self = this;
				//this.visitChildren (function (parent) {
				//console.log ('function', self.spelling, 'has child', this.spelling);
				//});
				//console.log('displayName', this.displayName);
				//console.log (this);
				//process.exit(0);
				break;
			case Cursor.MacroDefinition:
				//console.log('macro', this.spelling);
				break;
			case Cursor.InclusionDirective:
				//console.log('inclusion', this.spelling);
				break;
		}
		return Cursor.Continue;
	});

	return functionNames;
}

SourceFile.prototype.completionAt = function (line, colZero) {
	var col = colZero + 1;

	this.tu.codeCompleteAt (this.fileName, line, col);
}

module.exports = ClangProject;
