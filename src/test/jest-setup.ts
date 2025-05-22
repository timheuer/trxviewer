// This file is run before each test file by Jest

// Mock the VS Code API
const vscode = {
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        registerCustomEditorProvider: jest.fn().mockReturnValue({
            dispose: jest.fn()
        }),
        registerFileDecorationProvider: jest.fn().mockReturnValue({
            dispose: jest.fn()
        }),
        createWebviewPanel: jest.fn().mockReturnValue({
            webview: {
                options: {},
                html: '',
                onDidReceiveMessage: jest.fn(),
                asWebviewUri: (uri: any) => uri
            },
            onDidChangeViewState: jest.fn(),
            onDidDispose: jest.fn(),
            reveal: jest.fn()
        })
    },
    commands: {
        registerCommand: jest.fn().mockReturnValue({
            dispose: jest.fn()
        }),
        executeCommand: jest.fn().mockResolvedValue(undefined)
    },
    workspace: {
        getConfiguration: jest.fn().mockReturnValue({
            update: jest.fn().mockResolvedValue(undefined)
        }),
        fs: {
            stat: jest.fn().mockResolvedValue({})
        }
    },
    Uri: {
        file: (path: string) => ({
            scheme: 'file',
            path,
            fsPath: path,
            with: jest.fn().mockReturnValue({
                scheme: 'file',
                path,
                fsPath: path
            }),
            toString: () => `file://${path}`
        }),
        parse: jest.fn()
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
            this.event = jest.fn();
        }
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        event() {}
    }
};

// Set the VS Code mock as a global to be used by tests
(global as any).vscode = vscode;

// Mock the fs module
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn().mockImplementation((path) => {
            if (typeof path === 'string' && path.includes('.trx')) {
                return Promise.resolve('<TestRun></TestRun>');
            }
            if (typeof path === 'string' && path.includes('template.html')) {
                return Promise.resolve('<html></html>');
            }
            return Promise.resolve('');
        })
    },
    readFileSync: jest.fn().mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('.trx')) {
            return '<TestRun></TestRun>';
        }
        return '';
    })
}));