import * as vscode from "vscode";
import * as fs from "fs";
import { Uri, QuickPickItem } from "vscode";

let cachedFiles: string[] = [];
let cachedFolder = '';
let cachedExtension = '';
let cachedIndex : number | null = null;

let lock: Promise<void> | null = null;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "file-type-navigation.showFilesInRelativePath",
      async () => await showFilesInRelativePath()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "file-type-navigation.openNextFileInRelativePath",
      async () => await openNextFileInRelativePath()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "file-type-navigation.openPreviousFileInRelativePath",
      async () => await openPreviousFileInRelativePath()
    )
  );
}

async function showFilesInRelativePath() {
  if (lock) {
    await lock;  // Wait for the lock to release if there is an ongoing operation
  }

  let resolveLock: () => void = () => {};
  lock = new Promise(resolve => resolveLock = resolve);
  let activeFilePath = '';

  try {
    activeFilePath = await getActiveFilePath();
  }
  finally {
    resolveLock();  // Release the lock when done
    lock = null;    // Reset the lock
  }
  if (!activeFilePath) {
    vscode.window.showWarningMessage("Failed to retrieve the active file path.");
    return;
  }

  const activeFileName = fileBaseName(activeFilePath);
  let files = getFilesInDirectory(activeFilePath);

  files = files.filter(async (file) => file !== await activeFileName);

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
  if (lock) {
    await lock;  // Wait for the lock to release if there is an ongoing operation
  }

  let resolveLock: () => void = () => {};
  lock = new Promise(resolve => resolveLock = resolve);

  try {
  const activeFilePath = await getActiveFilePath();
  const activeFileName = fileBaseName(activeFilePath);
  const files = getFilesInDirectory(activeFilePath);

  let fileIndex = files.findIndex((file) => file === activeFileName);
  if (fileIndex === -1) {
    vscode.window.showWarningMessage("Active file (" + activeFileName + ") not found in the parent folder with files: " + files.join(", "));
	  return;
  }

  fileIndex++;
  if (fileIndex >= files.length) {
    fileIndex = 0;
  }
  cachedIndex = fileIndex;

  openFile(files[fileIndex]);
  } finally {
    resolveLock();  // Release the lock when done
    lock = null;    // Reset the lock
  }
}

async function openPreviousFileInRelativePath() {
  if (lock) {
    await lock;  // Wait for the lock to release if there is an ongoing operation
  }

  let resolveLock: () => void = () => {};
  lock = new Promise(resolve => resolveLock = resolve);

  try {
    const activeFilePath = await getActiveFilePath();
    const activeFileName = fileBaseName(activeFilePath);
    const files = getFilesInDirectory(activeFilePath);

    let fileIndex = files.findIndex((file) => file === activeFileName);
    if (fileIndex === -1) {
      vscode.window.showWarningMessage("Active file (" + activeFileName + ") not found in the parent folder with files: " + files.join(", "));
      return;
    }
    
    fileIndex--;
    if (fileIndex < 0) {
      fileIndex = files.length - 1;
    }
    cachedIndex = fileIndex;
    
    openFile(files[fileIndex]);
  } finally {
    resolveLock();  // Release the lock when done
    lock = null;    // Reset the lock
  }
}

async function getActiveFilePath() {
  // Save the original clipboard content to restore later
  const originalClipboardContent = await vscode.env.clipboard.readText();

  // Execute the command that copies the path of the active file to the clipboard
  await vscode.commands.executeCommand('workbench.action.files.copyPathOfActiveFile');

  // Retrieve the copied path from the clipboard
  let copiedPath = await vscode.env.clipboard.readText();

  // Restore the original clipboard content
  await vscode.env.clipboard.writeText(originalClipboardContent);

  // Check if the path was successfully retrieved
  if (!copiedPath) {
      vscode.window.showWarningMessage("Failed to retrieve the active file path.");
      return "";
  }
  const copiedParentFolder = getParentFolder(copiedPath);
  if (copiedParentFolder === cachedFolder && cachedIndex) {
    copiedPath = vscode.Uri.joinPath(vscode.Uri.file(cachedFolder), cachedFiles[cachedIndex]).fsPath;
  }
  else {
    cachedIndex = null;
    cachedFolder = copiedParentFolder;
  }
  cachedExtension = getFileExtension(copiedPath);
  return copiedPath;
}

function fileBaseName(fileName : string) {
  return fileName.replace(/\\/g, "/").split("/").at(-1);
}

function getFileExtension(fileName : string) {
  // Resolve the promise to get the actual value
  if (!fileName) {
    // Handle the case where fileName is undefined or empty
    vscode.window.showWarningMessage("File extension cannot be found for an empty file name.");
    return ""; // Return a default value or handle the error as appropriate
  }

  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // Handle the case where there is no dot in the filename
    vscode.window.showWarningMessage("The file (" + fileName + ") has no extension.");
    return ""; // Return a default value or handle as needed
  }

  return fileName.slice(lastDotIndex);
}

function getParentFolder(pathName : string = "") {
  if (!pathName) {
    vscode.window.showWarningMessage("Parent folder cannot be found for an empty path.");
    return "";
  }
  return pathName.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
}

function getFilesInDirectory(fileName = "") {
  const folder = getParentFolder(fileName);
  const extension = getFileExtension(fileName);

  if (!folder) {
    vscode.window.showWarningMessage("Can't list files in undefined parent folder.");
    return [];
  }

  // Return cached results if folder and extension have not changed
  if (cachedFolder === folder && cachedExtension === extension && cachedFiles.length > 0) {
    return cachedFiles;
  }

  if (!folder) {
    vscode.window.showWarningMessage("Can't find parent folder.");
    return [];
  }

  try {
    const files = fs.readdirSync(folder);
    const filteredFiles = files.filter(file => {
      const fullPath = Uri.joinPath(Uri.file(folder), file).fsPath;
      const stats = fs.lstatSync(fullPath);
      return stats.isFile() && file.endsWith(extension);
    });

    if (filteredFiles.length === 0) {
      vscode.window.showInformationMessage(`No files found in the parent folder (${folder}) with the extension (${extension}) for the file (${fileName}).`);
      return [];
    }

    // Update cache
    cachedFiles = filteredFiles;

    return filteredFiles;
  } catch (err) {
    vscode.window.showWarningMessage("Error accessing or reading the parent folder: " + folder);
    return [];
  }
}

function openFile(fileName: string) {
    const uri = vscode.Uri.joinPath(vscode.Uri.file(cachedFolder), fileName);

    // Use vscode.open to handle any type of file
    try {
      vscode.commands.executeCommand('vscode.open', uri);
    } catch (error) {
      vscode.window.showErrorMessage("Failed to open file: " + uri.fsPath);
    }
}

export function deactivate() {}
