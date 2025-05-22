import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Import the extension to test
import * as myExtension from '../../extension';
import { getSampleFilePath, readSampleFile, createMockUri, createMockExtensionContext } from './testUtils';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	
	let sandbox: sinon.SinonSandbox;
	let executeCommandStub: sinon.SinonStub;
	let showErrorMessageStub: sinon.SinonStub;
	let showInformationMessageStub: sinon.SinonStub;
	let getConfigurationStub: sinon.SinonStub;
	let viewTrxFileStub: sinon.SinonStub;
	
	setup(() => {
		sandbox = sinon.createSandbox();
		
		// Stub vscode.commands.executeCommand
		executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();
		
		// Stub vscode.window.showErrorMessage and showInformationMessage
		showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
		showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
		
		// Stub configuration
		getConfigurationStub = sandbox.stub(vscode.workspace, 'getConfiguration').returns({
			update: sandbox.stub().resolves()
		} as any);
		
		// Stub the trxViewer.viewTrxFile function
		viewTrxFileStub = sandbox.stub();
		sandbox.stub(require('../../trxViewer'), 'viewTrxFile').callsFake(viewTrxFileStub);
	});
	
	teardown(() => {
		sandbox.restore();
	});
	
	test('Extension should be present', () => {
		assert.ok(myExtension);
	});
	
	test('Activation - all components should be registered', async () => {
		const registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand').returns({
			dispose: () => {}
		});
		
		const registerCustomEditorProviderStub = sandbox.stub(vscode.window, 'registerCustomEditorProvider').returns({
			dispose: () => {}
		});
		
		const registerFileDecorationProviderStub = sandbox.stub(vscode.window, 'registerFileDecorationProvider').returns({
			dispose: () => {}
		});
		
		const context = createMockExtensionContext();
		
		// Call activate function
		myExtension.activate(context);
		
		// Check command registrations
		assert.strictEqual(registerCommandStub.callCount, 2, 'Should register 2 commands');
		assert.strictEqual(registerCommandStub.getCall(0).args[0], 'trxviewer.viewTrxFile', 'Should register viewTrxFile command');
		assert.strictEqual(registerCommandStub.getCall(1).args[0], 'trxviewer.openAsText', 'Should register openAsText command');
		
		// Check custom editor provider registration
		assert.strictEqual(registerCustomEditorProviderStub.callCount, 1, 'Should register 1 custom editor provider');
		assert.strictEqual(registerCustomEditorProviderStub.getCall(0).args[0], 'trxviewer.trxPreview', 'Should register trxPreview provider');
		
		// Check file decoration provider registration
		assert.strictEqual(registerFileDecorationProviderStub.callCount, 1, 'Should register 1 file decoration provider');
		
		// Check subscriptions were added
		assert.strictEqual(context.subscriptions.length, 4, 'Should add 4 disposables to context.subscriptions');
		
		// Check configuration update
		assert.strictEqual(getConfigurationStub.callCount, 1, 'Should update configuration');
	});
	
	test('viewTrxFile command - should open TRX file when URI is provided', async () => {
		// Get sample file path
		const filePath = getSampleFilePath('results-example-mstest.trx');
		const uri = createMockUri(filePath);
		
		// Call the command handler
		const commandHandler = sandbox.stub(vscode.commands, 'registerCommand');
		const context = createMockExtensionContext();
		
		myExtension.activate(context);
		
		// Get the command callback
		const viewTrxCallback = commandHandler.getCall(0).args[1];
		await viewTrxCallback(uri);
		
		// Check if viewTrxFile was called with correct arguments
		assert.strictEqual(viewTrxFileStub.callCount, 1, 'viewTrxFile should be called');
		assert.strictEqual(viewTrxFileStub.getCall(0).args[0], uri, 'Should pass URI to viewTrxFile');
		assert.strictEqual(viewTrxFileStub.getCall(0).args[1], context, 'Should pass context to viewTrxFile');
	});
	
	test('openAsText command - should execute vscode.openWith command', async () => {
		// Get sample file path
		const filePath = getSampleFilePath('results-example-mstest.trx');
		const uri = createMockUri(filePath);
		
		// Call the command handler
		const commandHandler = sandbox.stub(vscode.commands, 'registerCommand');
		const context = createMockExtensionContext();
		
		myExtension.activate(context);
		
		// Get the command callback
		const openAsTextCallback = commandHandler.getCall(1).args[1];
		await openAsTextCallback(uri);
		
		// Check if executeCommand was called with correct arguments
		assert.strictEqual(executeCommandStub.callCount, 1, 'executeCommand should be called');
		assert.strictEqual(executeCommandStub.getCall(0).args[0], 'vscode.openWith', 'Should call vscode.openWith');
		assert.strictEqual(executeCommandStub.getCall(0).args[1], uri, 'Should pass URI to openWith');
		assert.strictEqual(executeCommandStub.getCall(0).args[2], 'default', 'Should specify default editor');
	});
	
	test('TRX editor provider should resolve custom editor', async () => {
		const context = createMockExtensionContext();
		
		// Capture the provider instance
		let provider: any;
		sandbox.stub(vscode.window, 'registerCustomEditorProvider').callsFake((_, p) => {
			provider = p;
			return { dispose: () => {} };
		});
		
		// Activate the extension
		myExtension.activate(context);
		
		// Check that provider was registered
		assert.ok(provider, 'Provider should be registered');
		
		// Create a document and webview panel
		const uri = createMockUri(getSampleFilePath('results-example-mstest.trx'));
		const document = { uri, dispose: () => {} };
		
		// Mock webview panel
		const webviewPanel = {
			webview: {
				options: {},
				html: '',
				asWebviewUri: (uri: vscode.Uri) => uri,
				onDidReceiveMessage: sandbox.stub()
			},
			onDidChangeViewState: sandbox.stub(),
			onDidDispose: sandbox.stub()
		};
		
		// Call resolveCustomEditor
		await provider.resolveCustomEditor(document, webviewPanel, {});
		
		// Check if viewTrxFile was called
		assert.strictEqual(viewTrxFileStub.callCount, 1, 'viewTrxFile should be called');
	});
});
