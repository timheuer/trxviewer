// Local test runner that doesn't require downloading VS Code
// This is useful for development and CI environments where VS Code download may not work

const Mocha = require('mocha');
const glob = require('glob').glob;
const path = require('path');
const fs = require('fs');

async function runTests() {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 10000 // Longer timeout for tests
    });

    // Find all test files
    const testsRoot = path.resolve(__dirname, '.');
    const files = await glob('**/*.test.js', { cwd: testsRoot });

    // Add files to the test suite
    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

    // Mock VS Code API
    mockVSCode();

    // Run the tests
    return new Promise((resolve, reject) => {
        mocha.run(failures => {
            if (failures > 0) {
                reject(new Error(`${failures} tests failed.`));
            } else {
                resolve();
            }
        });
    });
}

function mockVSCode() {
    // Create mock VS Code module
    const vscode = {
        Uri: {
            file: (path) => ({ scheme: 'file', path, fsPath: path }),
            joinPath: (uri, ...paths) => ({ scheme: 'file', path: path.join(uri.path, ...paths), fsPath: path.join(uri.path, ...paths) }),
            parse: (str) => ({ scheme: 'file', path: str, fsPath: str })
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
                onDidDispose: () => ({ dispose: () => {} })
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
        }
    };

    // Register the mock as a module
    require.cache[require.resolve('vscode')] = {
        exports: vscode
    };
}

// Run the tests
runTests()
    .then(() => {
        console.log('All tests passed!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Tests failed:', err);
        process.exit(1);
    });