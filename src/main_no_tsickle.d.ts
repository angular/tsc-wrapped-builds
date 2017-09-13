import * as ts from 'typescript';
import { CliOptions } from './cli_options';
import NgOptions from './options';
export { UserError } from './tsc';
export interface CodegenExtension {
    /**
     * Returns the generated file names.
     */
    (ngOptions: NgOptions, cliOptions: CliOptions, program: ts.Program, host: ts.CompilerHost): Promise<string[]>;
}
export declare function createBundleIndexHost<H extends ts.CompilerHost>(ngOptions: NgOptions, rootFiles: string[], host: H): {
    host: H;
    indexName?: string;
    errors?: ts.Diagnostic[];
};
