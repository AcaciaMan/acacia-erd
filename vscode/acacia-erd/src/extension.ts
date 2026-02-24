import * as vscode from 'vscode';
import { ERDViewProvider } from './manage_erd/ERDViewProvider';
import { EntityTreePanel } from './manage_erd/EntityTreePanel';
import { InteractiveERDPanel } from './manage_erd/InteractiveERDPanel';
import { EntityManager } from './utils/EntityManager';
import { SourceFolderManager } from './utils/SourceFolderManager';
import { SourceFoldersTreeProvider, SourceFolderTreeItem } from './manage_erd/SourceFoldersTreeProvider';
import { DbConnectionManager } from './utils/DbConnectionManager';
import { DbConnectionsTreeProvider, DbConnectionTreeItem } from './manage_erd/DbConnectionsTreeProvider';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "acacia-erd" is now active!');

	// Create managers first (needed by ERDViewProvider and tree views)
	const sourceFolderManager = new SourceFolderManager();
	const dbConnectionManager = new DbConnectionManager();

	// ERD Dashboard - pass managers for status display
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('erdView',
			new ERDViewProvider(context, sourceFolderManager, dbConnectionManager))
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('openEntityTree', new EntityTreePanel(context))
	);

	// Register command to export interactive HTML
	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.exportInteractiveHtml', async () => {
			if (InteractiveERDPanel.currentPanel) {
				vscode.window.showInformationMessage('Please use the "Export HTML" button in the ERD panel.');
			} else {
				vscode.window.showWarningMessage('Please open an ERD diagram first before exporting.');
			}
		})
	);

	// Register command to open the Interactive ERD Editor
	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.openERDEditor', () => {
			InteractiveERDPanel.createOrShow(context.extensionPath);
		})
	);

	// Register command to focus the Entity Tree view
	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.showEntityTree', () => {
			vscode.commands.executeCommand('openEntityTree.focus');
		})
	);

	// Ensure EntityManager is initialized and register its disposal
	const entityManager = EntityManager.getInstance();
	context.subscriptions.push({ dispose: () => entityManager.dispose() });

	// Source Folders tree
	const sourceFoldersTreeProvider = new SourceFoldersTreeProvider(sourceFolderManager);
	context.subscriptions.push(
		vscode.window.createTreeView('acaciaSourceFolders', {
			treeDataProvider: sourceFoldersTreeProvider,
			showCollapseAll: false
		})
	);
	context.subscriptions.push({ dispose: () => sourceFolderManager.dispose() });

	// Source Folders commands
	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.addSourceFolder', async () => {
			const folderUris = await vscode.window.showOpenDialog({
				canSelectFolders: true,
				canSelectFiles: false,
				canSelectMany: false,
				openLabel: 'Select Source Folder'
			});
			if (folderUris && folderUris[0]) {
				const name = await vscode.window.showInputBox({
					prompt: 'Enter a descriptive name for this source folder',
					placeHolder: 'e.g., App Source, Migrations, Models',
					validateInput: (value) => {
						if (!value || !value.trim()) {
							return 'Name cannot be empty';
						}
						return undefined;
					}
				});
				if (name) {
					await sourceFolderManager.addFolder(name.trim(), folderUris[0].fsPath);
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.removeSourceFolder', async (item?: SourceFolderTreeItem) => {
			if (item) {
				await sourceFolderManager.removeFolder(item.folder.name);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.renameSourceFolder', async (item?: SourceFolderTreeItem) => {
			if (item) {
				const newName = await vscode.window.showInputBox({
					prompt: 'Enter new name for the source folder',
					value: item.folder.name,
					validateInput: (value) => {
						if (!value || !value.trim()) {
							return 'Name cannot be empty';
						}
						return undefined;
					}
				});
				if (newName && newName.trim() !== item.folder.name) {
					await sourceFolderManager.renameFolder(item.folder.name, newName.trim());
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.refreshSourceFolders', () => {
			sourceFoldersTreeProvider.refresh();
		})
	);

	// DB Connections tree
	const dbConnectionsTreeProvider = new DbConnectionsTreeProvider(dbConnectionManager);
	context.subscriptions.push(
		vscode.window.createTreeView('acaciaDbConnections', {
			treeDataProvider: dbConnectionsTreeProvider,
			showCollapseAll: false
		})
	);
	context.subscriptions.push({ dispose: () => dbConnectionManager.dispose() });

	// DB Connections commands
	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.addDbConnection', async () => {
			const name = await vscode.window.showInputBox({
				prompt: 'Enter a descriptive name for this database connection',
				placeHolder: 'e.g., Dev DB, Test DB, Production Schema',
				validateInput: (value) => {
					if (!value || !value.trim()) {
						return 'Name cannot be empty';
					}
					return undefined;
				}
			});
			if (!name) { return; }

			const connectionPath = await vscode.window.showInputBox({
				prompt: 'Enter the connection path (file path, connection string, or URL — no credentials)',
				placeHolder: 'e.g., sqlite:///data/dev.db, ./schema/prod.sql, localhost:5432/mydb',
				validateInput: (value) => {
					if (!value || !value.trim()) {
						return 'Connection path cannot be empty';
					}
					return undefined;
				}
			});
			if (connectionPath) {
				await dbConnectionManager.addConnection(name.trim(), connectionPath.trim());
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.removeDbConnection', async (item?: DbConnectionTreeItem) => {
			if (item) {
				await dbConnectionManager.removeConnection(item.connection.name);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.renameDbConnection', async (item?: DbConnectionTreeItem) => {
			if (item) {
				const newName = await vscode.window.showInputBox({
					prompt: 'Enter new name for the database connection',
					value: item.connection.name,
					validateInput: (value) => {
						if (!value || !value.trim()) {
							return 'Name cannot be empty';
						}
						return undefined;
					}
				});
				if (newName && newName.trim() !== item.connection.name) {
					await dbConnectionManager.renameConnection(item.connection.name, newName.trim());
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.editDbConnectionPath', async (item?: DbConnectionTreeItem) => {
			if (item) {
				const newPath = await vscode.window.showInputBox({
					prompt: 'Enter new connection path',
					value: item.connection.connectionPath,
					validateInput: (value) => {
						if (!value || !value.trim()) {
							return 'Connection path cannot be empty';
						}
						return undefined;
					}
				});
				if (newPath && newPath.trim() !== item.connection.connectionPath) {
					await dbConnectionManager.editConnectionPath(item.connection.name, newPath.trim());
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.refreshDbConnections', () => {
			dbConnectionsTreeProvider.refresh();
		})
	);

	// Focus commands for new views
	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.showSourceFolders', () => {
			vscode.commands.executeCommand('acaciaSourceFolders.focus');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.showDbConnections', () => {
			vscode.commands.executeCommand('acaciaDbConnections.focus');
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
