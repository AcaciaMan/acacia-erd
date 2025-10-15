// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ERDViewProvider } from './manage_erd/ERDViewProvider';
import { EntityTreePanel } from './manage_erd/EntityTreePanel';
import { InteractiveERDPanel } from './manage_erd/InteractiveERDPanel';
import { HtmlExporter } from './utils/HtmlExporter';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "acacia-erd" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('acacia-erd.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from acacia-erd!');
	});

	context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('erdView', new ERDViewProvider(context))
    );

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('openEntityTree', new EntityTreePanel(context))
	);

	// Register command to export interactive HTML
	const exportHtmlCommand = vscode.commands.registerCommand('acacia-erd.exportInteractiveHtml', async () => {
		// Get current ERD panel if open
		if (InteractiveERDPanel.currentPanel) {
			vscode.window.showInformationMessage('Please use the "Export HTML" button in the ERD panel.');
		} else {
			vscode.window.showWarningMessage('Please open an ERD diagram first before exporting.');
		}
	});

	context.subscriptions.push(exportHtmlCommand);
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
