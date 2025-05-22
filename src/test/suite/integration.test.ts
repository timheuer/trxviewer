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
        
        // Get the trxViewer module
        const trxViewer = require('../../trxViewer');
        
        // Get sample file path and create URI
        const filePath = getSampleFilePath('results-example-mstest.trx');
        const uri = createMockUri(filePath);
        
        // Call viewTrxFile directly to simulate command execution
        await trxViewer.viewTrxFile(uri, context);
        
        // Check that the webview's HTML was set (indicating successful parsing and rendering)
        assert.ok(webviewPanel.webview.html, 'Webview HTML should be set');
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
        
        // Get the trxViewer module
        const trxViewer = require('../../trxViewer');
        
        // Get sample file path and create URI
        const filePath = getSampleFilePath('results-example-mstest.trx');
        const uri = createMockUri(filePath);
        
        // Call viewTrxFile and expect it to handle the error
        try {
            await trxViewer.viewTrxFile(uri, context, webviewPanel as any);
            assert.fail('Should have thrown an error');
        } catch (error) {
            // Check that error message was shown
            assert.ok(showErrorMessageStub.called, 'Error message should be shown');
            // Check that the error contains expected information
            assert.ok(webviewPanel.webview.html.includes('Error'), 'Webview should show error');
        }
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
        
        // Stub viewTrxFile to track calls
        const viewTrxFileStub = sandbox.stub().resolves();
        const originalModule = require.cache[require.resolve('../../trxViewer')];
        require.cache[require.resolve('../../trxViewer')] = {
            exports: {
                viewTrxFile: viewTrxFileStub
            }
        };
        
        // Call the viewTrxFile command
        const uri = createMockUri(getSampleFilePath('results-example-mstest.trx'));
        await commandRegistry['trxviewer.viewTrxFile'](uri);
        
        // Check that viewTrxFile was called with the correct URI
        assert.strictEqual(viewTrxFileStub.callCount, 1, 'viewTrxFile should be called');
        assert.strictEqual(viewTrxFileStub.getCall(0).args[0], uri, 'URI should be passed to viewTrxFile');
        
        // Restore the original module
        require.cache[require.resolve('../../trxViewer')] = originalModule;
    });
});