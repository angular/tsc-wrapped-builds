"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var ts = require("typescript");
var bundler_1 = require("./bundler");
var compiler_host_1 = require("./compiler_host");
var index_writer_1 = require("./index_writer");
var tsc_1 = require("./tsc");
exports.UserError = tsc_1.UserError;
var DTS = /\.d\.ts$/;
var JS_EXT = /(\.js|)$/;
function createBundleIndexHost(ngOptions, rootFiles, host) {
    var files = rootFiles.filter(function (f) { return !DTS.test(f); });
    if (files.length != 1) {
        return {
            host: host,
            errors: [{
                    file: null,
                    start: null,
                    length: null,
                    messageText: 'Angular compiler option "flatModuleIndex" requires one and only one .ts file in the "files" field.',
                    category: ts.DiagnosticCategory.Error,
                    code: 0
                }]
        };
    }
    var file = files[0];
    var indexModule = file.replace(/\.ts$/, '');
    var bundler = new bundler_1.MetadataBundler(indexModule, ngOptions.flatModuleId, new bundler_1.CompilerHostAdapter(host));
    var metadataBundle = bundler.getMetadataBundle();
    var metadata = JSON.stringify(metadataBundle.metadata);
    var name = path.join(path.dirname(indexModule), ngOptions.flatModuleOutFile.replace(JS_EXT, '.ts'));
    var libraryIndex = "./" + path.basename(indexModule);
    var content = index_writer_1.privateEntriesToIndex(libraryIndex, metadataBundle.privates);
    host = compiler_host_1.createSyntheticIndexHost(host, { name: name, content: content, metadata: metadata });
    return { host: host, indexName: name };
}
exports.createBundleIndexHost = createBundleIndexHost;
//# sourceMappingURL=main_no_tsickle.js.map