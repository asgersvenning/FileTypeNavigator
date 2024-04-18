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
  if (!vscode.window.activeTextEditor) {
    vscode.window.showWarningMessage("No active editor.");
    return "";
  }
  return vscode.window.activeTextEditor.document.uri.fsPath;
}

function getActiveFileName() {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showWarningMessage("No active editor.");
    return "";
  }
  return vscode.window.activeTextEditor.document.fileName.replace(/\\/g, "/").split("/").at(-1);
}

function getActiveParentFolder() {
  const filePath = getActiveFilePath();
  if (!filePath) {
    console.log("No active file path found."); // Debugging log
    return "";
  }
  
  const parentFolder = filePath.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
  if (!parentFolder) {
    console.log("Could not determine the parent folder for path:", filePath); // Debugging log
  }
  return parentFolder;
}

async function getFilesInCurrentRelativePath() {
  const folder = getActiveParentFolder();
  const extension = getActiveFileExtension();

  if (!folder) {
    vscode.window.showWarningMessage("Can't find parent folder.");
    return [];
  }

  const files = await fs.promises.readdir(folder);
  const filteredFiles = [];

  for (const file of files) {
    const uri = Uri.joinPath(Uri.file(folder), file);
    const stats = await fs.promises.lstat(uri.fsPath);
    if (stats.isFile() && file.endsWith(extension)) {
      filteredFiles.push(file);
    }
  }

  return filteredFiles;
}

function getActiveFileExtension() {
  const fileName = getActiveFileName();
  if (!fileName) {
    // Handle the case where fileName is undefined or empty
    console.log("No active file or filename could be retrieved.");
    return ""; // Return a default value or handle the error as appropriate
  }

  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // Handle the case where there is no dot in the filename
    console.log("The file has no extension.");
    return ""; // Return a default value or handle as needed
  }

  return fileName.slice(lastDotIndex);
}

function openFile(fileName: string) {
  const activeParentFolder = getActiveParentFolder();

  if (!activeParentFolder) {
    return;
  }

  const uri = Uri.joinPath(Uri.file(activeParentFolder), fileName);
  vscode.window.showTextDocument(uri);
}

export function deactivate() {}
