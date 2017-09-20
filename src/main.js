"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var tsickle = require("tsickle");
var ts = require("typescript");
var cli_options_1 = require("./cli_options");
var compiler_host_1 = require("./compiler_host");
var main_no_tsickle_1 = require("./main_no_tsickle");
var tsc_1 = require("./tsc");
var vinyl_file_1 = require("./vinyl_file");
var TS_EXT = /\.ts$/;
function main(project, cliOptions, codegen, options) {
    try {
        var projectDir = project;
        // project is vinyl like file object
        if (vinyl_file_1.isVinylFile(project)) {
            projectDir = path.dirname(project.path);
        }
        else if (fs.lstatSync(project).isFile()) {
            projectDir = path.dirname(project);
        }
        // file names in tsconfig are resolved relative to this absolute path
        var basePath_1 = path.resolve(process.cwd(), cliOptions.basePath || projectDir);
        // read the configuration options from wherever you store them
        var _a = tsc_1.tsc.readConfiguration(project, basePath_1, options), parsed_1 = _a.parsed, ngOptions_1 = _a.ngOptions;
        ngOptions_1.basePath = basePath_1;
        var rootFileNames_1 = parsed_1.fileNames.slice(0);
        var createProgram_1 = function (host, oldProgram) {
            return ts.createProgram(rootFileNames_1.slice(0), parsed_1.options, host, oldProgram);
        };
        var addGeneratedFileName_1 = function (genFileName) {
            if (genFileName.startsWith(basePath_1) && TS_EXT.exec(genFileName)) {
                rootFileNames_1.push(genFileName);
            }
        };
        var diagnostics_1 = parsed_1.options.diagnostics;
        if (diagnostics_1)
            ts.performance.enable();
        var host_1 = ts.createCompilerHost(parsed_1.options, true);
        // Make sure we do not `host.realpath()` from TS as we do not want to resolve symlinks.
        // https://github.com/Microsoft/TypeScript/issues/9552
        host_1.realpath = function (fileName) { return fileName; };
        // If the compilation is a flat module index then produce the flat module index
        // metadata and the synthetic flat module index.
        if (ngOptions_1.flatModuleOutFile && !ngOptions_1.skipMetadataEmit) {
            var _b = main_no_tsickle_1.createBundleIndexHost(ngOptions_1, rootFileNames_1, host_1), bundleHost = _b.host, indexName = _b.indexName, errors_1 = _b.errors;
            if (errors_1)
                tsc_1.check(errors_1);
            if (indexName)
                addGeneratedFileName_1(indexName);
            host_1 = bundleHost;
        }
        var tsickleHost_1 = {
            shouldSkipTsickleProcessing: function (fileName) { return /\.d\.ts$/.test(fileName); },
            pathToModuleName: function (context, importPath) { return ''; },
            shouldIgnoreWarningsForPath: function (filePath) { return false; },
            fileNameToModuleId: function (fileName) { return fileName; },
            googmodule: false,
            untyped: true,
            convertIndexImportShorthand: false,
            transformDecorators: ngOptions_1.annotationsAs !== 'decorators',
            transformTypesToClosure: ngOptions_1.annotateForClosureCompiler,
        };
        var program_1 = createProgram_1(host_1);
        var errors = program_1.getOptionsDiagnostics();
        tsc_1.check(errors);
        if (ngOptions_1.skipTemplateCodegen || !codegen) {
            codegen = function () { return Promise.resolve([]); };
        }
        if (diagnostics_1)
            console.time('NG codegen');
        return codegen(ngOptions_1, cliOptions, program_1, host_1).then(function (genFiles) {
            if (diagnostics_1)
                console.timeEnd('NG codegen');
            // Add the generated files to the configuration so they will become part of the program.
            if (ngOptions_1.alwaysCompileGeneratedCode) {
                genFiles.forEach(function (genFileName) { return addGeneratedFileName_1(genFileName); });
            }
            if (!ngOptions_1.skipMetadataEmit) {
                host_1 = new compiler_host_1.MetadataWriterHost(host_1, ngOptions_1, true);
            }
            // Create a new program since codegen files were created after making the old program
            var programWithCodegen = createProgram_1(host_1, program_1);
            tsc_1.tsc.typeCheck(host_1, programWithCodegen);
            if (diagnostics_1)
                console.time('Emit');
            var emitDiags = tsickle.emitWithTsickle(programWithCodegen, tsickleHost_1, host_1, ngOptions_1).diagnostics;
            if (diagnostics_1)
                console.timeEnd('Emit');
            tsc_1.check(emitDiags);
            if (diagnostics_1) {
                ts.performance.forEachMeasure(function (name, duration) { console.error("TS " + name + ": " + duration + "ms"); });
            }
        });
    }
    catch (e) {
        return Promise.reject(e);
    }
}
exports.main = main;
// CLI entry point
if (require.main === module) {
    var args = process.argv.slice(2);
    var _a = ts.parseCommandLine(args), options = _a.options, errors = _a.errors;
    tsc_1.check(errors);
    var project = options.project || '.';
    // TODO(alexeagle): command line should be TSC-compatible, remove "CliOptions" here
    var cliOptions = new cli_options_1.CliOptions(require('minimist')(args));
    main(project, cliOptions, undefined, options)
        .then(function (exitCode) { return process.exit(exitCode); })
        .catch(function (e) {
        console.error(e.stack);
        console.error('Compilation failed');
        process.exit(1);
    });
}
//# sourceMappingURL=main.js.map