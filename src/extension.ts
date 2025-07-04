// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { viewTrxFile } from './trxViewer';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Register command to open TRX file in viewer
	let viewTrxCommand = vscode.commands.registerCommand('trxviewer.viewTrxFile', async (uri?: vscode.Uri) => {
		try {
			if (uri) {
				await viewTrxFile(uri, context);
			} else if (vscode.window.activeTextEditor) {
				const currentUri = vscode.window.activeTextEditor.document.uri;
				if (currentUri.fsPath.toLowerCase().endsWith('.trx')) {
					await viewTrxFile(currentUri, context);
				} else {
					vscode.window.showErrorMessage('The current file is not a TRX file');
				}
			} else {
				vscode.window.showErrorMessage('No file is currently open');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error viewing TRX file: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	// Register command to open TRX file as text
	let openAsTextCommand = vscode.commands.registerCommand('trxviewer.openAsText', async (uri?: vscode.Uri) => {
		try {
			if (!uri && vscode.window.activeTextEditor) {
				// If no URI is provided but there's an active editor, use its URI
				uri = vscode.window.activeTextEditor.document.uri;
			}
			
			if (uri) {
				await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
			} else {
				vscode.window.showErrorMessage('No file is currently open');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error opening TRX file as text: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	// Register custom editor provider
	const provider = new TrxEditorProvider(context.extensionUri);
	const providerRegistration = vscode.window.registerCustomEditorProvider(
		'trxviewer.trxPreview',
		provider,
		{
			webviewOptions: { retainContextWhenHidden: true },
			supportsMultipleEditorsPerDocument: false
		}
	);

	// File decoration provider for TRX files
	const decorationProvider = vscode.window.registerFileDecorationProvider({
		provideFileDecoration: (uri: vscode.Uri) => {
			if (uri.fsPath.toLowerCase().endsWith('.trx')) {
				return {
					badge: '🧪',
					tooltip: 'TRX Test Results File'
				};
			}
			return null;
		}
	});

	context.subscriptions.push(
		viewTrxCommand,
		openAsTextCommand,
		providerRegistration,
		decorationProvider
	);

	// Set as default editor for TRX files
	vscode.workspace.getConfiguration().update(
		'workbench.editorAssociations',
		{
			"*.trx": "trxviewer.trxPreview"
		},
		vscode.ConfigurationTarget.Global
	);
}

// Custom editor provider for TRX files
class TrxEditorProvider implements vscode.CustomEditorProvider {
	private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<vscode.CustomDocument>>();
	public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

	constructor(
		private readonly extensionUri: vscode.Uri,
	) { }

	async resolveCustomEditor(
		document: vscode.CustomDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		const cssUri = webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webview', 'styles.css'));
		const vscodeElementsCssUri = webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webview', 'vscode-elements.css'));
		const codiconsUri = webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'));

		try {
			await viewTrxFile(
				(document as any).uri,
				{
					extensionUri: this.extensionUri,
					cssUri: cssUri,
					vscodeElementsCssUri: vscodeElementsCssUri,
					codiconsUri: codiconsUri
				},
				webviewPanel
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			webviewPanel.webview.html = `<html><body><h1>Error</h1><p>Could not open TRX file: ${errorMessage}</p></body></html>`;
			vscode.window.showErrorMessage(`Error opening TRX file: ${errorMessage}`);
		}
	}

	async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
		return { uri, dispose: () => { } };
	}

	// Required method implementations
	async saveCustomDocument(document: vscode.CustomDocument): Promise<void> {
		// TRX files are read-only
		return;
	}

	async saveCustomDocumentAs(document: vscode.CustomDocument, destination: vscode.Uri): Promise<void> {
		// TRX files are read-only
		return;
	}

	async revertCustomDocument(document: vscode.CustomDocument): Promise<void> {
		// TRX files are read-only
		return;
	}

	async backupCustomDocument(
		document: vscode.CustomDocument,
		context: vscode.CustomDocumentBackupContext
	): Promise<vscode.CustomDocumentBackup> {
		return {
			id: document.uri.toString(),
			delete: () => { }
		};
	}
}

export function deactivate() { }
