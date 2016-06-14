"use strict";
var ts = require('typescript');
var Symbols = (function () {
    function Symbols(sourceFile) {
        this.sourceFile = sourceFile;
    }
    Symbols.prototype.resolve = function (name) { return this.symbols.get(name); };
    Symbols.prototype.define = function (name, value) { this.symbols.set(name, value); };
    Symbols.prototype.has = function (name) { return this.symbols.has(name); };
    Object.defineProperty(Symbols.prototype, "symbols", {
        get: function () {
            var result = this._symbols;
            if (!result) {
                result = this._symbols = new Map();
                populateBuiltins(result);
                this.buildImports();
            }
            return result;
        },
        enumerable: true,
        configurable: true
    });
    Symbols.prototype.buildImports = function () {
        var symbols = this._symbols;
        // Collect the imported symbols into this.symbols
        var stripQuotes = function (s) { return s.replace(/^['"]|['"]$/g, ''); };
        var visit = function (node) {
            switch (node.kind) {
                case ts.SyntaxKind.ImportEqualsDeclaration:
                    var importEqualsDeclaration = node;
                    if (importEqualsDeclaration.moduleReference.kind ===
                        ts.SyntaxKind.ExternalModuleReference) {
                        var externalReference = importEqualsDeclaration.moduleReference;
                        // An `import <identifier> = require(<module-specifier>);
                        var from_1 = stripQuotes(externalReference.expression.getText());
                        symbols.set(importEqualsDeclaration.name.text, { __symbolic: 'reference', module: from_1 });
                    }
                    else {
                        symbols.set(importEqualsDeclaration.name.text, { __symbolic: 'error', message: "Unsupported import syntax" });
                    }
                    break;
                case ts.SyntaxKind.ImportDeclaration:
                    var importDecl = node;
                    if (!importDecl.importClause) {
                        // An `import <module-specifier>` clause which does not bring symbols into scope.
                        break;
                    }
                    var from = stripQuotes(importDecl.moduleSpecifier.getText());
                    if (importDecl.importClause.name) {
                        // An `import <identifier> form <module-specifier>` clause. Record the defualt symbol.
                        symbols.set(importDecl.importClause.name.text, { __symbolic: 'reference', module: from, default: true });
                    }
                    var bindings = importDecl.importClause.namedBindings;
                    if (bindings) {
                        switch (bindings.kind) {
                            case ts.SyntaxKind.NamedImports:
                                // An `import { [<identifier> [, <identifier>] } from <module-specifier>` clause
                                for (var _i = 0, _a = bindings.elements; _i < _a.length; _i++) {
                                    var binding = _a[_i];
                                    symbols.set(binding.name.text, {
                                        __symbolic: 'reference',
                                        module: from,
                                        name: binding.propertyName ? binding.propertyName.text : binding.name.text
                                    });
                                }
                                break;
                            case ts.SyntaxKind.NamespaceImport:
                                // An `input * as <identifier> from <module-specifier>` clause.
                                symbols.set(bindings.name.text, { __symbolic: 'reference', module: from });
                                break;
                        }
                    }
                    break;
            }
            ts.forEachChild(node, visit);
        };
        if (this.sourceFile) {
            ts.forEachChild(this.sourceFile, visit);
        }
    };
    return Symbols;
}());
exports.Symbols = Symbols;
function populateBuiltins(symbols) {
    // From lib.core.d.ts (all "define const")
    ['Object', 'Function', 'String', 'Number', 'Array', 'Boolean', 'Map', 'NaN', 'Infinity', 'Math',
        'Date', 'RegExp', 'Error', 'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError',
        'TypeError', 'URIError', 'JSON', 'ArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array',
        'Uint8ClampedArray', 'Uint16Array', 'Int16Array', 'Int32Array', 'Uint32Array', 'Float32Array',
        'Float64Array']
        .forEach(function (name) { return symbols.set(name, { __symbolic: 'reference', name: name }); });
}
//# sourceMappingURL=symbols.js.map