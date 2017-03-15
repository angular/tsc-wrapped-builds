"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var path = require("path");
var ts = require("typescript");
var collector_1 = require("./collector");
var schema_1 = require("./schema");
// The character set used to produce private names.
var PRIVATE_NAME_CHARS = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
];
var MetadataBundler = (function () {
    function MetadataBundler(root, importAs, host) {
        this.root = root;
        this.importAs = importAs;
        this.host = host;
        this.symbolMap = new Map();
        this.metadataCache = new Map();
        this.exports = new Map();
        this.rootModule = "./" + path.basename(root);
    }
    MetadataBundler.prototype.getMetadataBundle = function () {
        // Export the root module. This also collects the transitive closure of all values referenced by
        // the exports.
        var exportedSymbols = this.exportAll(this.rootModule);
        this.canonicalizeSymbols(exportedSymbols);
        // TODO: exports? e.g. a module re-exports a symbol from another bundle
        var entries = this.getEntries(exportedSymbols);
        var privates = Array.from(this.symbolMap.values())
            .filter(function (s) { return s.referenced && s.isPrivate; })
            .map(function (s) { return ({
            privateName: s.privateName,
            name: s.declaration.name,
            module: s.declaration.module
        }); });
        return {
            metadata: { __symbolic: 'module', version: schema_1.VERSION, metadata: entries, importAs: this.importAs },
            privates: privates
        };
    };
    MetadataBundler.resolveModule = function (importName, from) {
        return resolveModule(importName, from);
    };
    MetadataBundler.prototype.getMetadata = function (moduleName) {
        var result = this.metadataCache.get(moduleName);
        if (!result) {
            if (moduleName.startsWith('.')) {
                var fullModuleName = resolveModule(moduleName, this.root);
                result = this.host.getMetadataFor(fullModuleName);
            }
            this.metadataCache.set(moduleName, result);
        }
        return result;
    };
    MetadataBundler.prototype.exportAll = function (moduleName) {
        var _this = this;
        var module = this.getMetadata(moduleName);
        var result = this.exports.get(moduleName);
        if (result) {
            return result;
        }
        result = [];
        var exportSymbol = function (exportedSymbol, exportAs) {
            var symbol = _this.symbolOf(moduleName, exportAs);
            result.push(symbol);
            exportedSymbol.reexportedAs = symbol;
            symbol.exports = exportedSymbol;
        };
        // Export all the symbols defined in this module.
        if (module && module.metadata) {
            for (var key in module.metadata) {
                var data = module.metadata[key];
                if (schema_1.isMetadataImportedSymbolReferenceExpression(data)) {
                    // This is a re-export of an imported symbol. Record this as a re-export.
                    var exportFrom = resolveModule(data.module, moduleName);
                    this.exportAll(exportFrom);
                    var symbol = this.symbolOf(exportFrom, data.name);
                    exportSymbol(symbol, key);
                }
                else {
                    // Record that this symbol is exported by this module.
                    result.push(this.symbolOf(moduleName, key));
                }
            }
        }
        // Export all the re-exports from this module
        if (module && module.exports) {
            for (var _i = 0, _a = module.exports; _i < _a.length; _i++) {
                var exportDeclaration = _a[_i];
                var exportFrom = resolveModule(exportDeclaration.from, moduleName);
                // Record all the exports from the module even if we don't use it directly.
                this.exportAll(exportFrom);
                if (exportDeclaration.export) {
                    // Re-export all the named exports from a module.
                    for (var _b = 0, _c = exportDeclaration.export; _b < _c.length; _b++) {
                        var exportItem = _c[_b];
                        var name_1 = typeof exportItem == 'string' ? exportItem : exportItem.name;
                        var exportAs = typeof exportItem == 'string' ? exportItem : exportItem.as;
                        exportSymbol(this.symbolOf(exportFrom, name_1), exportAs);
                    }
                }
                else {
                    // Re-export all the symbols from the module
                    var exportedSymbols = this.exportAll(exportFrom);
                    for (var _d = 0, exportedSymbols_1 = exportedSymbols; _d < exportedSymbols_1.length; _d++) {
                        var exportedSymbol = exportedSymbols_1[_d];
                        var name_2 = exportedSymbol.name;
                        exportSymbol(exportedSymbol, name_2);
                    }
                }
            }
        }
        this.exports.set(moduleName, result);
        return result;
    };
    /**
     * Fill in the canonicalSymbol which is the symbol that should be imported by factories.
     * The canonical symbol is the one exported by the index file for the bundle or definition
     * symbol for private symbols that are not exported by bundle index.
     */
    MetadataBundler.prototype.canonicalizeSymbols = function (exportedSymbols) {
        var symbols = Array.from(this.symbolMap.values());
        this.exported = new Set(exportedSymbols);
        ;
        symbols.forEach(this.canonicalizeSymbol, this);
    };
    MetadataBundler.prototype.canonicalizeSymbol = function (symbol) {
        var rootExport = getRootExport(symbol);
        var declaration = getSymbolDeclaration(symbol);
        var isPrivate = !this.exported.has(rootExport);
        var canonicalSymbol = isPrivate ? declaration : rootExport;
        symbol.isPrivate = isPrivate;
        symbol.declaration = declaration;
        symbol.canonicalSymbol = canonicalSymbol;
    };
    MetadataBundler.prototype.getEntries = function (exportedSymbols) {
        var _this = this;
        var result = {};
        var exportedNames = new Set(exportedSymbols.map(function (s) { return s.name; }));
        var privateName = 0;
        function newPrivateName() {
            while (true) {
                var digits = [];
                var index = privateName++;
                var base = PRIVATE_NAME_CHARS;
                while (!digits.length || index > 0) {
                    digits.unshift(base[index % base.length]);
                    index = Math.floor(index / base.length);
                }
                digits.unshift('\u0275');
                var result_1 = digits.join('');
                if (!exportedNames.has(result_1))
                    return result_1;
            }
        }
        exportedSymbols.forEach(function (symbol) { return _this.convertSymbol(symbol); });
        Array.from(this.symbolMap.values()).forEach(function (symbol) {
            if (symbol.referenced) {
                var name_3 = symbol.name;
                if (symbol.isPrivate && !symbol.privateName) {
                    name_3 = newPrivateName();
                    ;
                    symbol.privateName = name_3;
                }
                result[name_3] = symbol.value;
            }
        });
        return result;
    };
    MetadataBundler.prototype.convertSymbol = function (symbol) {
        var canonicalSymbol = symbol.canonicalSymbol;
        if (!canonicalSymbol.referenced) {
            canonicalSymbol.referenced = true;
            var declaration = canonicalSymbol.declaration;
            var module_1 = this.getMetadata(declaration.module);
            if (module_1) {
                var value = module_1.metadata[declaration.name];
                if (value && !declaration.name.startsWith('___')) {
                    canonicalSymbol.value = this.convertEntry(declaration.module, value);
                }
            }
        }
    };
    MetadataBundler.prototype.convertEntry = function (moduleName, value) {
        if (schema_1.isClassMetadata(value)) {
            return this.convertClass(moduleName, value);
        }
        if (schema_1.isFunctionMetadata(value)) {
            return this.convertFunction(moduleName, value);
        }
        if (schema_1.isInterfaceMetadata(value)) {
            return value;
        }
        return this.convertValue(moduleName, value);
    };
    MetadataBundler.prototype.convertClass = function (moduleName, value) {
        var _this = this;
        return {
            __symbolic: 'class',
            arity: value.arity,
            extends: this.convertExpression(moduleName, value.extends),
            decorators: value.decorators && value.decorators.map(function (d) { return _this.convertExpression(moduleName, d); }),
            members: this.convertMembers(moduleName, value.members),
            statics: value.statics && this.convertStatics(moduleName, value.statics)
        };
    };
    MetadataBundler.prototype.convertMembers = function (moduleName, members) {
        var _this = this;
        var result = {};
        for (var name_4 in members) {
            var value = members[name_4];
            result[name_4] = value.map(function (v) { return _this.convertMember(moduleName, v); });
        }
        return result;
    };
    MetadataBundler.prototype.convertMember = function (moduleName, member) {
        var _this = this;
        var result = { __symbolic: member.__symbolic };
        result.decorators =
            member.decorators && member.decorators.map(function (d) { return _this.convertExpression(moduleName, d); });
        if (schema_1.isMethodMetadata(member)) {
            result.parameterDecorators = member.parameterDecorators &&
                member.parameterDecorators.map(function (d) { return d && d.map(function (p) { return _this.convertExpression(moduleName, p); }); });
            if (schema_1.isConstructorMetadata(member)) {
                if (member.parameters) {
                    result.parameters =
                        member.parameters.map(function (p) { return _this.convertExpression(moduleName, p); });
                }
            }
        }
        return result;
    };
    MetadataBundler.prototype.convertStatics = function (moduleName, statics) {
        var result = {};
        for (var key in statics) {
            var value = statics[key];
            result[key] = schema_1.isFunctionMetadata(value) ? this.convertFunction(moduleName, value) : value;
        }
        return result;
    };
    MetadataBundler.prototype.convertFunction = function (moduleName, value) {
        var _this = this;
        return {
            __symbolic: 'function',
            parameters: value.parameters,
            defaults: value.defaults && value.defaults.map(function (v) { return _this.convertValue(moduleName, v); }),
            value: this.convertValue(moduleName, value.value)
        };
    };
    MetadataBundler.prototype.convertValue = function (moduleName, value) {
        var _this = this;
        if (isPrimitive(value)) {
            return value;
        }
        if (schema_1.isMetadataError(value)) {
            return this.convertError(moduleName, value);
        }
        if (schema_1.isMetadataSymbolicExpression(value)) {
            return this.convertExpression(moduleName, value);
        }
        if (Array.isArray(value)) {
            return value.map(function (v) { return _this.convertValue(moduleName, v); });
        }
        // Otherwise it is a metadata object.
        var object = value;
        var result = {};
        for (var key in object) {
            result[key] = this.convertValue(moduleName, object[key]);
        }
        return result;
    };
    MetadataBundler.prototype.convertExpression = function (moduleName, value) {
        if (value) {
            switch (value.__symbolic) {
                case 'error':
                    return this.convertError(moduleName, value);
                case 'reference':
                    return this.convertReference(moduleName, value);
                default:
                    return this.convertExpressionNode(moduleName, value);
            }
        }
        return value;
    };
    MetadataBundler.prototype.convertError = function (module, value) {
        return {
            __symbolic: 'error',
            message: value.message,
            line: value.line,
            character: value.character,
            context: value.context, module: module
        };
    };
    MetadataBundler.prototype.convertReference = function (moduleName, value) {
        var _this = this;
        var createReference = function (symbol) {
            var declaration = symbol.declaration;
            if (declaration.module.startsWith('.')) {
                // Reference to a symbol defined in the module. Ensure it is converted then return a
                // references to the final symbol.
                _this.convertSymbol(symbol);
                return {
                    __symbolic: 'reference',
                    get name() {
                        // Resolved lazily because private names are assigned late.
                        var canonicalSymbol = symbol.canonicalSymbol;
                        if (canonicalSymbol.isPrivate == null) {
                            throw Error('Invalid state: isPrivate was not initialized');
                        }
                        return canonicalSymbol.isPrivate ? canonicalSymbol.privateName : canonicalSymbol.name;
                    }
                };
            }
            else {
                // The symbol was a re-exported symbol from another module. Return a reference to the
                // original imported symbol.
                return { __symbolic: 'reference', name: declaration.name, module: declaration.module };
            }
        };
        if (schema_1.isMetadataGlobalReferenceExpression(value)) {
            var metadata = this.getMetadata(moduleName);
            if (metadata && metadata.metadata && metadata.metadata[value.name]) {
                // Reference to a symbol defined in the module
                return createReference(this.canonicalSymbolOf(moduleName, value.name));
            }
            // If a reference has arguments, the arguments need to be converted.
            if (value.arguments) {
                return {
                    __symbolic: 'reference',
                    name: value.name,
                    arguments: value.arguments.map(function (a) { return _this.convertValue(moduleName, a); })
                };
            }
            // Global references without arguments (such as to Math or JSON) are unmodified.
            return value;
        }
        if (schema_1.isMetadataImportedSymbolReferenceExpression(value)) {
            // References to imported symbols are separated into two, references to bundled modules and
            // references to modules
            // external to the bundle. If the module reference is relative it is assuemd to be in the
            // bundle. If it is Global
            // it is assumed to be outside the bundle. References to symbols outside the bundle are left
            // unmodified. Refernces
            // to symbol inside the bundle need to be converted to a bundle import reference reachable
            // from the bundle index.
            if (value.module.startsWith('.')) {
                // Reference is to a symbol defined inside the module. Convert the reference to a reference
                // to the canonical
                // symbol.
                var referencedModule = resolveModule(value.module, moduleName);
                var referencedName = value.name;
                return createReference(this.canonicalSymbolOf(referencedModule, referencedName));
            }
            // Value is a reference to a symbol defined outside the module.
            if (value.arguments) {
                // If a reference has arguments the arguments need to be converted.
                var result = {
                    __symbolic: 'reference',
                    name: value.name,
                    module: value.module,
                    arguments: value.arguments.map(function (a) { return _this.convertValue(moduleName, a); })
                };
            }
            return value;
        }
        if (schema_1.isMetadataModuleReferenceExpression(value)) {
            // Cannot support references to bundled modules as the internal modules of a bundle are erased
            // by the bundler.
            if (value.module.startsWith('.')) {
                return {
                    __symbolic: 'error',
                    message: 'Unsupported bundled module reference',
                    context: { module: value.module }
                };
            }
            // References to unbundled modules are unmodified.
            return value;
        }
    };
    MetadataBundler.prototype.convertExpressionNode = function (moduleName, value) {
        var result = { __symbolic: value.__symbolic };
        for (var key in value) {
            result[key] = this.convertValue(moduleName, value[key]);
        }
        return result;
    };
    MetadataBundler.prototype.symbolOf = function (module, name) {
        var symbolKey = module + ":" + name;
        var symbol = this.symbolMap.get(symbolKey);
        if (!symbol) {
            symbol = { module: module, name: name };
            this.symbolMap.set(symbolKey, symbol);
        }
        return symbol;
    };
    MetadataBundler.prototype.canonicalSymbolOf = function (module, name) {
        // Ensure the module has been seen.
        this.exportAll(module);
        var symbol = this.symbolOf(module, name);
        if (!symbol.canonicalSymbol) {
            this.canonicalizeSymbol(symbol);
        }
        return symbol;
    };
    return MetadataBundler;
}());
exports.MetadataBundler = MetadataBundler;
var CompilerHostAdapter = (function () {
    function CompilerHostAdapter(host) {
        this.host = host;
        this.collector = new collector_1.MetadataCollector();
    }
    CompilerHostAdapter.prototype.getMetadataFor = function (fileName) {
        var sourceFile = this.host.getSourceFile(fileName + '.ts', ts.ScriptTarget.Latest);
        return this.collector.getMetadata(sourceFile);
    };
    return CompilerHostAdapter;
}());
exports.CompilerHostAdapter = CompilerHostAdapter;
function resolveModule(importName, from) {
    if (importName.startsWith('.') && from) {
        return normalize(path.join(path.dirname(from), importName));
    }
    return importName;
}
function normalize(path) {
    var parts = path.split('/');
    var segments = [];
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var part = parts_1[_i];
        switch (part) {
            case '':
            case '.':
                continue;
            case '..':
                segments.pop();
                break;
            default:
                segments.push(part);
        }
    }
    if (segments.length) {
        segments.unshift(path.startsWith('/') ? '' : '.');
        return segments.join('/');
    }
    else {
        return '.';
    }
}
function isPrimitive(o) {
    return o === null || (typeof o !== 'function' && typeof o !== 'object');
}
function isMetadataArray(o) {
    return Array.isArray(o);
}
function getRootExport(symbol) {
    return symbol.reexportedAs ? getRootExport(symbol.reexportedAs) : symbol;
}
function getSymbolDeclaration(symbol) {
    return symbol.exports ? getSymbolDeclaration(symbol.exports) : symbol;
}
//# sourceMappingURL=bundler.js.map