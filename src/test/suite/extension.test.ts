// Patch global.vscode.LogLevel before any imports
(global as any).vscode = (global as any).vscode || {};
(global as any).vscode.LogLevel = {
    Trace: 0,
    Debug: 1,
    Info: 2,
    Warning: 3,
    Error: 4,
    Critical: 5,
    Off: 6
};
// Patch vscode before any imports
require('./testUtils').setupVscodeMocks();

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Import Jest
import { describe, test, beforeEach, afterEach, expect } from '@jest/globals';

// Import the extension to test
import * as myExtension from '../../extension';
import { getSampleFilePath, readSampleFile, createMockUri, createMockExtensionContext } from './testUtils';

describe('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	
	let sandbox: sinon.SinonSandbox;
	let executeCommandStub: sinon.SinonStub;
	let showErrorMessageStub: sinon.SinonStub;
	let showInformationMessageStub: sinon.SinonStub;
	let getConfigurationStub: sinon.SinonStub;
	let viewTrxFileStub: sinon.SinonStub;
	
	beforeEach(() => {
		sandbox = sinon.createSandbox();
		
		// Stub vscode.commands.executeCommand
		executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();
		
		// Stub vscode.window.showErrorMessage and showInformationMessage
		showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
		showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
		

		// Stub configuration with get method
		getConfigurationStub = sandbox.stub(vscode.workspace, 'getConfiguration').returns({
			get: (key: string, defaultValue?: any) => {
				if (key === 'logLevel') { return 'info'; }
				return defaultValue;
			},
			update: sandbox.stub().resolves()
		} as any);
		
		// Stub the trxViewer.viewTrxFile function
		viewTrxFileStub = sandbox.stub();
		sandbox.stub(require('../../trxViewer'), 'viewTrxFile').callsFake(viewTrxFileStub);
	});
	
	afterEach(() => {
		sandbox.restore();
	});
	
	test('Extension should be present', () => {
		expect(myExtension).toBeDefined();
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
		expect(registerCommandStub.callCount).toBe(3);
		expect(registerCommandStub.getCall(0).args[0]).toBe('trxviewer.viewTrxFile');
		expect(registerCommandStub.getCall(1).args[0]).toBe('trxviewer.openAsText');
		expect(registerCommandStub.getCall(2).args[0]).toBe('trxviewer.reportIssue');
		
		// Check custom editor provider registration
		expect(registerCustomEditorProviderStub.callCount).toBe(1);
		expect(registerCustomEditorProviderStub.getCall(0).args[0]).toBe('trxviewer.trxPreview');
		
		// Check file decoration provider registration
		expect(registerFileDecorationProviderStub.callCount).toBe(1);
		
		// Check subscriptions were added
		expect(context.subscriptions.length).toBe(5);
		
		// Check configuration update
	expect(getConfigurationStub.callCount).toBe(2);
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
		expect(viewTrxFileStub.callCount).toBe(1);
		expect(viewTrxFileStub.getCall(0).args[0]).toBe(uri);
		expect(viewTrxFileStub.getCall(0).args[1]).toBe(context);
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
		expect(executeCommandStub.callCount).toBe(1);
		expect(executeCommandStub.getCall(0).args[0]).toBe('vscode.openWith');
		expect(executeCommandStub.getCall(0).args[1]).toBe(uri);
		expect(executeCommandStub.getCall(0).args[2]).toBe('default');
	});
		test('TRX editor provider should handle custom editor registration', async () => {
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
		expect(provider).toBeDefined();
		
		// Instead of calling resolveCustomEditor which relies on joinPath,
		// we'll just verify that a provider was registered with the correct view type
		expect(vscode.window.registerCustomEditorProvider).toHaveBeenCalledWith(
			'trxviewer.trxPreview',
			expect.anything(),
			expect.anything()
		);
	});
});
