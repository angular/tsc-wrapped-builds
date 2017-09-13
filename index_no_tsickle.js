"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
// This index allows tsc-wrapped to be used with no dependency on tsickle.
// Short-term workaround until tsc-wrapped is removed entirely.
var compiler_host_1 = require("./src/compiler_host");
exports.MetadataWriterHost = compiler_host_1.MetadataWriterHost;
var main_no_tsickle_1 = require("./src/main_no_tsickle");
exports.UserError = main_no_tsickle_1.UserError;
exports.createBundleIndexHost = main_no_tsickle_1.createBundleIndexHost;
__export(require("./src/bundler"));
__export(require("./src/cli_options"));
__export(require("./src/collector"));
__export(require("./src/index_writer"));
__export(require("./src/schema"));
//# sourceMappingURL=index_no_tsickle.js.map