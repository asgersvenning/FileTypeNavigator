import * as vscode from "vscode";
import * as fs from "fs";
import { Uri, QuickPickItem } from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "relative-path-navigation.showFilesInRelativePath",
      async () => await showFilesInRelativePath()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "relative-path-navigation.openNextFileInRelativePath",
      async () => await openNextFileInRelativePath()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "relative-path-navigation.openPreviousFileInRelativePath",
      async () => await openPreviousFileInRelativePath()
    )
  );
}

async function showFilesInRelativePath() {
  let files = await getFilesInCurrentRelativePath();

  const activeFileName = getActiveFileName();
  files = files.filter((file) => file !== activeFileName);

  const directoryFiles: QuickPickItem[] = files.map((file) => ({
    label: file,
  }));

  if (!directoryFiles.length) {
    vscode.window.showInformationMessage("There is no extra files in the parent folder.");
    return;
  }

  vscode.window.showQuickPick(directoryFiles, { placeHolder: "Search files by name" }).then((selection) => {
    if (!selection) {
      return;
    }

    openFile(selection.label);
  });
}

async function openNextFileInRelativePath() {
  const files = await getFilesInCurrentRelativePath();

  const activeFileName = getActiveFileName();
  let fileIndex = files.findIndex((file) => file === activeFileName);
  if (fileIndex === -1) {
	return;
  }

  fileIndex++;
  if (fileIndex >= files.length) {
    fileIndex = 0;
  }

  openFile(files[fileIndex]);
}

async function openPreviousFileInRelativePath() {
	const files = await getFilesInCurrentRelativePath();

	const activeFileName = getActiveFileName();
	let fileIndex = files.findIndex((file) => file === activeFileName);
	if (fileIndex === -1) {
	  return;
	}
  
	fileIndex--;
	if (fileIndex < 0) {
	  fileIndex = files.length - 1;
	}
  
	openFile(files[fileIndex]);
}

function getActiveFilePath() {
  return vscode.window.activeTextEditor?.document.uri.fsPath ?? "";
}

function getActiveFileName() {
  return vscode.window.activeTextEditor?.document.fileName.replace(/\\/g, "/").split("/").at(-1) ?? "";
}

function getActiveParentFolder() {
  return getActiveFilePath().replace(/\\/g, "/").split("/").slice(0, -1).join("/");
}

async function getFilesInCurrentRelativePath() {
  const folder = getActiveParentFolder();

  if (!folder) {
    vscode.window.showWarningMessage("Can't find parent folder.");
    return [];
  }

  const files = await fs.promises.readdir(folder);

  const activeParentFolder = getActiveParentFolder();
  return files.filter(async (file) => {
    const uri = Uri.joinPath(Uri.file(activeParentFolder), file);
    const stats = await fs.promises.lstat(uri.fsPath);
    return stats.isFile();
  });
}

function openFile(fileName: string) {
  const activeParentFolder = getActiveParentFolder();

  if (!activeParentFolder) {
    return;
  }

  const uri = Uri.joinPath(Uri.file(activeParentFolder), fileName);
  vscode.window.showTextDocument(uri);
}

// this method is called when your extension is deactivated
export function deactivate() {}
