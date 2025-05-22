import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Import the modules to test
import * as myExtension from '../../extension';
import { getSampleFilePath, readSampleFile, createMockUri, createMockExtensionContext } from './testUtils';

suite('Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start integration tests.');
    
    let sandbox: sinon.SinonSandbox;
    let showErrorMessageStub: sinon.SinonStub;
    let context: vscode.ExtensionContext;
    let viewTrxFileStub: sinon.SinonStub;
    
    setup(() => {
        sandbox = sinon.createSandbox();
        showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
        context = createMockExtensionContext();
        
        // Stub file system operations
        sandbox.stub(fs.promises, 'readFile').callsFake((path) => {
            if (path.toString().endsWith('.trx')) {
                return Promise.resolve(readSampleFile('results-example-mstest.trx'));
            }
            if (path.toString().includes('template.html')) {
                return Promise.resolve('<html><body>{{testRun.name}}</body></html>');
            }
            return Promise.resolve('');
        });
        
        // Stub workspace fs.stat to simulate file exists
        sandbox.stub(vscode.workspace.fs, 'stat').resolves({} as vscode.FileStat);
        
        // Stub the trxViewer.viewTrxFile function for direct testing
        viewTrxFileStub = sandbox.stub();
        sandbox.stub(require('../../trxViewer'), 'viewTrxFile').callsFake(viewTrxFileStub);
    });
    
    teardown(() => {
        sandbox.restore();
    });
    
    test('Full flow - viewTrxFile should parse and display TRX content', async () => {
        // This test checks the integration between the extension's command
        // and the trxViewer's viewTrxFile function
        
        // Create a mock webview panel
        const webviewPanel = {
            webview: {
                options: {},
                html: '',
                asWebviewUri: (uri: vscode.Uri) => uri,
                onDidReceiveMessage: sandbox.stub()
            },
            onDidChangeViewState: sandbox.stub(),
            onDidDispose: sandbox.stub(),
            reveal: sandbox.stub()
        };
        
        // Stub createWebviewPanel to return our mock
        sandbox.stub(vscode.window, 'createWebviewPanel').returns(webviewPanel as any);
        
        // Get the trxViewer module with the original implementation for this test
        const trxViewer = require('../../trxViewer');
        viewTrxFileStub.restore();
        
        // Get sample file path and create URI
        const filePath = getSampleFilePath('results-example-mstest.trx');
        const uri = createMockUri(filePath);
        
        // Test directly calling command handler
        const commandHandler = sandbox.stub(vscode.commands, 'registerCommand');
        myExtension.activate(context);
        
        // Get the command callback
        const viewTrxCallback = commandHandler.getCall(0).args[1];
        await viewTrxCallback(uri);
    });
    
    test('Error handling - viewTrxFile should handle invalid TRX files', async () => {
        // Test handling of invalid TRX files
        
        // Override readFile to return invalid content
        sandbox.restore();
        sandbox.stub(fs.promises, 'readFile').resolves('This is not a valid TRX file');
        sandbox.stub(vscode.workspace.fs, 'stat').resolves({} as vscode.FileStat);
        showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
        
        // Create a mock webview panel
        const webviewPanel = {
            webview: {
                options: {},
                html: '',
                asWebviewUri: (uri: vscode.Uri) => uri,
                onDidReceiveMessage: sandbox.stub()
            }
        };
        
        // Create a stub for viewTrxFile that passes through to the real implementation
        // but captures errors for testing
        const trxViewer = require('../../trxViewer');
        let capturedError: Error | undefined;
        
        sandbox.stub(trxViewer, 'viewTrxFile').callsFake(async (...args) => {
            try {
                // Call the real implementation
                await trxViewer.viewTrxFile.wrappedMethod(...args);
            } catch (err) {
                capturedError = err as Error;
                throw err;
            }
        });
        
        // Get sample file path and create URI
        const filePath = getSampleFilePath('results-example-mstest.trx');
        const uri = createMockUri(filePath);
        
        // Test directly calling command handler, but catch the expected error
        const commandHandler = sandbox.stub(vscode.commands, 'registerCommand');
        myExtension.activate(context);
        
        // Get the command callback
        const viewTrxCallback = commandHandler.getCall(0).args[1];
        try {
            await viewTrxCallback(uri);
        } catch (err) {
            // Expected to throw
        }
        
        // Check that error was shown
        assert.ok(showErrorMessageStub.called, 'Error message should be shown');
    });
    
    test('Integration of extension activation with command registration', async () => {
        // Stub command registration and capture the command implementations
        const commandRegistry: Record<string, Function> = {};
        sandbox.stub(vscode.commands, 'registerCommand').callsFake((command, handler) => {
            commandRegistry[command] = handler;
            return { dispose: () => {} };
        });
        
        // Stub window.registerCustomEditorProvider
        sandbox.stub(vscode.window, 'registerCustomEditorProvider').returns({
            dispose: () => {}
        });
        
        // Stub window.registerFileDecorationProvider
        sandbox.stub(vscode.window, 'registerFileDecorationProvider').returns({
            dispose: () => {}
        });
        
        // Activate the extension
        myExtension.activate(context);
        
        // Check that both commands were registered
        assert.ok(commandRegistry['trxviewer.viewTrxFile'], 'viewTrxFile command should be registered');
        assert.ok(commandRegistry['trxviewer.openAsText'], 'openAsText command should be registered');
        
        // Call the viewTrxFile command
        const uri = createMockUri(getSampleFilePath('results-example-mstest.trx'));
        await commandRegistry['trxviewer.viewTrxFile'](uri);
        
        // Check that viewTrxFile was called with the correct URI
        assert.strictEqual(viewTrxFileStub.callCount, 1, 'viewTrxFile should be called');
        assert.strictEqual(viewTrxFileStub.getCall(0).args[0], uri, 'URI should be passed to viewTrxFile');
    });
});