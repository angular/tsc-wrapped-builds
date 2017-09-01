import * as ts from 'typescript';
import { CliOptions } from './cli_options';
import { CodegenExtension } from './main_no_tsickle';
import { VinylFile } from './vinyl_file';
export declare function main(project: string | VinylFile, cliOptions: CliOptions, codegen?: CodegenExtension, options?: ts.CompilerOptions): Promise<any>;
