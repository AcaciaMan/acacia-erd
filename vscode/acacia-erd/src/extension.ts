import * as vscode from 'vscode';
import { ERDViewProvider } from './manage_erd/ERDViewProvider';
import { EntityTreePanel } from './manage_erd/EntityTreePanel';
import { InteractiveERDPanel } from './manage_erd/InteractiveERDPanel';
import { EntityManager } from './utils/EntityManager';
import { SourceFolderManager } from './utils/SourceFolderManager';
import { DbConnectionManager } from './utils/DbConnectionManager';
import { AssetsTreeProvider, SourceFolderItem, DbConnectionItem, EntitiesListItem } from './manage_erd/AssetsTreeProvider';
import { EntitiesListManager } from './utils/EntitiesListManager';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "acacia-erd" is now active!');

	// Create managers first (needed by ERDViewProvider and tree views)
	const sourceFolderManager = new SourceFolderManager();
	const dbConnectionManager = new DbConnectionManager();
	const entitiesListManager = new EntitiesListManager();

	// ERD Dashboard - pass managers for status display
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('erdView',
			new ERDViewProvider(context, sourceFolderManager, dbConnectionManager, entitiesListManager))
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

	// Assets tree (unified: Source Folders + DB Connections + Entities Lists)
	const assetsTreeProvider = new AssetsTreeProvider(sourceFolderManager, dbConnectionManager, entitiesListManager);
	context.subscriptions.push(
		vscode.window.createTreeView('acaciaAssets', {
			treeDataProvider: assetsTreeProvider,
			showCollapseAll: true
		})
	);
	context.subscriptions.push({ dispose: () => sourceFolderManager.dispose() });
	context.subscriptions.push({ dispose: () => entitiesListManager.dispose() });

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
		vscode.commands.registerCommand('acacia-erd.removeSourceFolder', async (item?: SourceFolderItem) => {
			if (item) {
				await sourceFolderManager.removeFolder(item.folder.name);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.renameSourceFolder', async (item?: SourceFolderItem) => {
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
		vscode.commands.registerCommand('acacia-erd.removeDbConnection', async (item?: DbConnectionItem) => {
			if (item) {
				await dbConnectionManager.removeConnection(item.connection.name);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.renameDbConnection', async (item?: DbConnectionItem) => {
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
		vscode.commands.registerCommand('acacia-erd.editDbConnectionPath', async (item?: DbConnectionItem) => {
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

	// Entities Lists commands
	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.addEntitiesList', async () => {
			const name = await vscode.window.showInputBox({
				prompt: 'Enter a descriptive name for this entities list',
				placeHolder: 'e.g., Main Schema, Auth Module, User Management',
				validateInput: (value) => {
					if (!value || !value.trim()) {
						return 'Name cannot be empty';
					}
					return undefined;
				}
			});
			if (!name) { return; }

			const fileUri = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				openLabel: 'Select Entities JSON File',
				filters: { 'JSON Files': ['json'] }
			});
			if (fileUri && fileUri[0]) {
				await entitiesListManager.addList(name.trim(), fileUri[0].fsPath);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.removeEntitiesList', async (item?: EntitiesListItem) => {
			if (item) {
				await entitiesListManager.removeList(item.list.name);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.renameEntitiesList', async (item?: EntitiesListItem) => {
			if (item) {
				const newName = await vscode.window.showInputBox({
					prompt: 'Enter new name for the entities list',
					value: item.list.name,
					validateInput: (value) => {
						if (!value || !value.trim()) {
							return 'Name cannot be empty';
						}
						return undefined;
					}
				});
				if (newName && newName.trim() !== item.list.name) {
					await entitiesListManager.renameList(item.list.name, newName.trim());
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.editEntitiesListPath', async (item?: EntitiesListItem) => {
			if (item) {
				const fileUri = await vscode.window.showOpenDialog({
					canSelectFiles: true,
					canSelectFolders: false,
					canSelectMany: false,
					openLabel: 'Select New Entities JSON File',
					filters: { 'JSON Files': ['json'] }
				});
				if (fileUri && fileUri[0]) {
					await entitiesListManager.editListPath(item.list.name, fileUri[0].fsPath);
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.selectEntitiesList', async (item?: EntitiesListItem) => {
			if (item) {
				const entityManager = EntityManager.getInstance();
				entityManager.setEntitiesJsonPath(item.absolutePath);
				vscode.window.showInformationMessage(`Loaded entities list: ${item.list.name}`);
				// Focus the Entity Tree so user sees the loaded entities
				vscode.commands.executeCommand('openEntityTree.focus');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.refreshAssets', () => {
			assetsTreeProvider.refresh();
		})
	);

	// Focus commands for views
	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.showSourceFolders', () => {
			vscode.commands.executeCommand('acaciaAssets.focus');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('acacia-erd.showDbConnections', () => {
			vscode.commands.executeCommand('acaciaAssets.focus');
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
