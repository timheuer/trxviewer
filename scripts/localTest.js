// Local test runner that doesn't require downloading VS Code
// This is useful for development and CI environments where VS Code download may not work

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const sinon = require('sinon');

// Mock VS Code API before running tests
mockVSCode();

// Run Jest tests directly
try {
    const jestBin = path.resolve(__dirname, '../node_modules/.bin/jest');
    execSync(`node ${jestBin}`, { stdio: 'inherit' });
    console.log('All tests passed!');
    process.exit(0);
} catch (err) {
    console.error('Tests failed:', err.message);
    process.exit(1);
}

function mockVSCode() {
    // Create mock VS Code module
    const vscode = {
        Uri: {
            file: (path) => ({ 
                scheme: 'file', 
                path, 
                fsPath: path,
                authority: '',
                query: '',
                fragment: '',
                with: () => ({ 
                    scheme: 'file', 
                    path, 
                    fsPath: path,
                    authority: '',
                    query: '',
                    fragment: '',
                }),
                toString: () => `file://${path}`
            }),
            joinPath: (uri, ...paths) => ({ 
                scheme: 'file', 
                path: path.join(uri.path, ...paths), 
                fsPath: path.join(uri.path, ...paths),
                authority: '',
                query: '',
                fragment: '',
                with: () => ({ scheme: 'file', path: path.join(uri.path, ...paths), fsPath: path.join(uri.path, ...paths) }),
                toString: () => `file://${path.join(uri.path, ...paths)}`
            }),
            parse: (str) => ({ 
                scheme: 'file', 
                path: str, 
                fsPath: str,
                authority: '',
                query: '',
                fragment: '',
                with: () => ({ scheme: 'file', path: str, fsPath: str }),
                toString: () => str
            })
        },
        commands: {
            registerCommand: () => ({ dispose: () => {} }),
            executeCommand: () => Promise.resolve()
        },
        window: {
            showInformationMessage: () => Promise.resolve(),
            showErrorMessage: () => Promise.resolve(),
            createWebviewPanel: () => ({
                webview: {
                    options: {},
                    html: '',
                    asWebviewUri: (uri) => uri,
                    onDidReceiveMessage: () => ({ dispose: () => {} })
                },
                onDidChangeViewState: () => ({ dispose: () => {} }),
                onDidDispose: () => ({ dispose: () => {} }),
                reveal: () => {}
            }),
            registerCustomEditorProvider: () => ({ dispose: () => {} }),
            registerFileDecorationProvider: () => ({ dispose: () => {} }),
            activeTextEditor: null
        },
        workspace: {
            fs: {
                stat: () => Promise.resolve({ type: 1 })
            },
            getConfiguration: () => ({
                update: () => Promise.resolve()
            })
        },
        ExtensionMode: {
            Test: 3,
            Development: 1,
            Production: 2
        },
        ViewColumn: {
            Beside: 2
        },
        ConfigurationTarget: {
            Global: 1
        },
        EventEmitter: class {
            constructor() {
                this.event = function() {};
            }
        }
    };

    // Create a fake module
    class Module {
        constructor() {
            this.exports = vscode;
        }
    }

    // Override require to return our mock for vscode
    const originalRequire = module.constructor.prototype.require;
    module.constructor.prototype.require = function(modulePath) {
        if (modulePath === 'vscode') {
            return vscode;
        }
        return originalRequire.apply(this, arguments);
    };
    
    // Mock fs.promises.readFile to return sample TRX content for tests
    const sampleTrxContent = fs.readFileSync(path.resolve(__dirname, '../sample/results-example-mstest.trx'), 'utf-8');
    
    // Add stubs to avoid real file access
    sinon.stub(fs.promises, 'readFile').callsFake((filePath) => {
        if (typeof filePath === 'string' && filePath.endsWith('.trx')) {
            return Promise.resolve(sampleTrxContent);
        }
        if (typeof filePath === 'string' && filePath.includes('template.html')) {
            return Promise.resolve('<html><body>{{testRun.name}}</body></html>');
        }
        return Promise.resolve('');
    });

    console.log('VS Code API mocked successfully');
}