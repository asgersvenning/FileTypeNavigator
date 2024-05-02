This is a fork of [Danilo Peres `relative-path-navigator`](https://github.com/DaniloPeres/relative-path-navigation), which changes two things:

1) It works for all file types.
2) When switching between files, only files with the same file-extension are considered.

# Usage

`FileTypeNavigator` has three commands:

| Command                                                | Functionality                     | Shortcut            |
|--------------------------------------------------------|-----------------------------------|---------------------|
| `file-type-navigation.openNextFileInRelativePath`      | Switch tab to next file*          | `Ctrl + DownArrow`  |
| `file-type-navigation.openPreviousFileInRelativePath`  | Switch tab to previous file*      | `Ctrl + UpArrow`    |
| `file-type-navigation.showFilesInRelativePath`         | Show files in current directory*  | `Ctrl + E`          |

\* With the same file extension and in the same directory as the file open in the currently active tab
