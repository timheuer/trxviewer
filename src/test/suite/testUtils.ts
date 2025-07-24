export function setupVscodeMocks() {
    // Patch LogLevel if not present
    if (!("LogLevel" in vscode)) {
        Object.defineProperty(vscode, "LogLevel", {
            value: {
                Trace: 0,
                Debug: 1,
                Info: 2,
                Warning: 3,
                Error: 4,
                Critical: 5,
                Off: 6
            },
            writable: false,
            configurable: true
        });
    }
    // Patch getConfiguration
    if (vscode && vscode.workspace) {
        vscode.workspace.getConfiguration = function(section?: string) {
            return {
                get: function(key: string, defaultValue?: any) {
                    if (key === "logLevel") {
                        return "info";
                    }
                    if (arguments.length === 1) {
                        return undefined;
                    }
                    return defaultValue;
                },
                update: () => Promise.resolve(),
                has: () => true,
                inspect: () => undefined
            };
        };
    // Patch onDidChangeConfiguration to a no-op
    vscode.workspace.onDidChangeConfiguration = function() { return { dispose: () => {} }; };
    }
    // Patch createOutputChannel
    if (vscode && vscode.window) {
        vscode.window.createOutputChannel = function(name: string, opts?: any) {
            let logLevel = vscode.LogLevel ? vscode.LogLevel.Info : 2;
            let listeners: Array<any> = [];
            return {
                name,
                logLevel: vscode.LogLevel ? vscode.LogLevel.Info : 2,
                append: (value: string) => {},
                appendLine: (value: string) => {},
                replace: (value: string) => {},
                trace: (...args: any[]) => {},
                debug: (...args: any[]) => {},
                info: (...args: any[]) => {},
                warn: (...args: any[]) => {},
                error: (...args: any[]) => {},
                show: () => {},
                hide: () => {},
                clear: () => {},
                dispose: () => {},
                onDidChangeLogLevel: (cb: any) => {
                    listeners.push(cb);
                    return { dispose: () => {} };
                }
            };
        };
    }
}
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Get the path to a sample TRX file
 * @param filename The name of the sample file
 * @returns The absolute path to the sample file
 */
export function getSampleFilePath(filename: string): string {
    return path.resolve(__dirname, '../../../sample', filename);
}

/**
 * Read the content of a sample TRX file
 * @param filename The name of the sample file
 * @returns The content of the sample file
 */
export function readSampleFile(filename: string): string {
    const filePath = getSampleFilePath(filename);
    return fs.readFileSync(filePath, 'utf-8');
}
/**
 * Create a mock VSCode Uri
 * @param filePath The file path
 * @returns A mock vscode.Uri object
 */
export function createMockUri(filePath: string): vscode.Uri {
    return {
        scheme: 'file',
        path: filePath,
        fsPath: filePath,
        with: () => createMockUri(filePath),
        toJSON: () => ({}),
        // Adding missing properties
        authority: '',
        query: '',
        fragment: '',
        toString: () => filePath
    } as vscode.Uri;
}

/**
 * Mock extension context for testing
 * @returns A mock vscode.ExtensionContext object
 */
export function createMockExtensionContext(): vscode.ExtensionContext {
    const extensionUri = createMockUri('/test/extension');
    
    return {
        extensionUri: extensionUri,
        subscriptions: [],
        workspaceState: {
            get: () => undefined,
            update: () => Promise.resolve(),
            keys: () => []
        },
        globalState: {
            get: () => undefined,
            update: () => Promise.resolve(),
            setKeysForSync: () => {},
            keys: () => []
        },
        extensionPath: '/test/extension',
        asAbsolutePath: (relativePath: string) => path.join('/test/extension', relativePath),
        storagePath: '/test/storage',
        globalStoragePath: '/test/globalStorage',
        logPath: '/test/logs',
        storageUri: createMockUri('/test/storage'),
        globalStorageUri: createMockUri('/test/globalStorage'),
        logUri: createMockUri('/test/logs'),
        extensionMode: vscode.ExtensionMode.Test,        secrets: {
            get: () => Promise.resolve(''),
            store: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            onDidChange: () => ({ dispose: () => {} })
        },        // Add missing properties
        environmentVariableCollection: {
            getScoped: () => ({} as vscode.EnvironmentVariableCollection)
        } as unknown as vscode.GlobalEnvironmentVariableCollection,
        extension: {} as vscode.Extension<any>,
        languageModelAccessInformation: {
            keyInformation: undefined
        }
    } as unknown as vscode.ExtensionContext;
}
