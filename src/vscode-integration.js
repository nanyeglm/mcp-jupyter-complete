import chokidar from 'chokidar';
import fs from 'fs-extra';
import path from 'path';

export class VSCodeIntegration {
  constructor() {
    this.watchers = new Map();
    this.reloadCallbacks = new Map();
  }

  async triggerReload(notebookPath) {
    try {
      // Touch the file to trigger VS Code's file watcher
      const stats = await fs.stat(notebookPath);
      const now = new Date();
      await fs.utimes(notebookPath, now, now);
      
      return {
        content: [
          {
            type: "text",
            text: `Triggered VS Code reload for: ${notebookPath}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to trigger reload: ${error.message}`);
    }
  }

  async setupFileWatcher(notebookPath, callback) {
    if (this.watchers.has(notebookPath)) {
      this.watchers.get(notebookPath).close();
    }

    const watcher = chokidar.watch(notebookPath, {
      ignored: /^\\./, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (path) => {
      if (callback) {
        callback(path);
      }
    });

    this.watchers.set(notebookPath, watcher);
    this.reloadCallbacks.set(notebookPath, callback);

    return {
      content: [
        {
          type: "text",
          text: `File watcher setup for: ${notebookPath}`
        }
      ]
    };
  }

  async removeFileWatcher(notebookPath) {
    if (this.watchers.has(notebookPath)) {
      this.watchers.get(notebookPath).close();
      this.watchers.delete(notebookPath);
      this.reloadCallbacks.delete(notebookPath);
      
      return {
        content: [
          {
            type: "text",
            text: `File watcher removed for: ${notebookPath}`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `No file watcher found for: ${notebookPath}`
        }
      ]
    };
  }

  async generateVSCodeSettings(workspaceDir) {
    const vscodeDir = path.join(workspaceDir, '.vscode');
    const settingsPath = path.join(vscodeDir, 'settings.json');
    
    // Ensure .vscode directory exists
    await fs.ensureDir(vscodeDir);
    
    const settings = {
      "files.watcherExclude": {
        "**/.git/objects/**": true,
        "**/.git/subtree-cache/**": true,
        "**/node_modules/**": true,
        "**/.ipynb_checkpoints/**": true
      },
      "files.autoSave": "off",
      "notebook.cellToolbarLocation": {
        "default": "right",
        "jupyter-notebook": "left"
      },
      "notebook.diffEditor.ignoreTrimWhitespace": false,
      "notebook.output.textLineLimit": 30,
      "jupyter.askForKernelRestart": false,
      "jupyter.interactiveWindow.textEditor.executeSelection": true,
      "jupyter.sendSelectionToInteractiveWindow": false,
      "notebook.formatOnSave.enabled": true,
      "notebook.codeActionsOnSave": {
        "source.organizeImports": true
      }
    };
    
    try {
      // Read existing settings if they exist
      let existingSettings = {};
      if (await fs.pathExists(settingsPath)) {
        const content = await fs.readFile(settingsPath, 'utf8');
        existingSettings = JSON.parse(content);
      }
      
      // Merge settings
      const mergedSettings = { ...existingSettings, ...settings };
      
      // Write back to file
      await fs.writeFile(settingsPath, JSON.stringify(mergedSettings, null, 2));
      
      return {
        content: [
          {
            type: "text",
            text: `VS Code settings configured at: ${settingsPath}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create VS Code settings: ${error.message}`);
    }
  }

  async generateVSCodeExtensions(workspaceDir) {
    const vscodeDir = path.join(workspaceDir, '.vscode');
    const extensionsPath = path.join(vscodeDir, 'extensions.json');
    
    await fs.ensureDir(vscodeDir);
    
    const extensions = {
      "recommendations": [
        "ms-python.python",
        "ms-toolsai.jupyter",
        "ms-toolsai.jupyter-keymap",
        "ms-toolsai.jupyter-renderers",
        "ms-python.black-formatter",
        "charliermarsh.ruff"
      ]
    };
    
    try {
      await fs.writeFile(extensionsPath, JSON.stringify(extensions, null, 2));
      
      return {
        content: [
          {
            type: "text",
            text: `VS Code extension recommendations configured at: ${extensionsPath}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create VS Code extensions file: ${error.message}`);
    }
  }

  async createVSCodeWorkspace(workspaceDir, notebookPaths = []) {
    const workspacePath = path.join(workspaceDir, 'jupyter-workspace.code-workspace');
    
    const workspace = {
      "folders": [
        {
          "name": "Jupyter Notebooks",
          "path": "."
        }
      ],
      "settings": {
        "python.defaultInterpreterPath": "./venv/bin/python",
        "jupyter.kernels.filter": [
          {
            "path": "./venv/bin/python",
            "type": "pythonEnvironment"
          }
        ]
      },
      "extensions": {
        "recommendations": [
          "ms-python.python",
          "ms-toolsai.jupyter"
        ]
      }
    };
    
    try {
      await fs.writeFile(workspacePath, JSON.stringify(workspace, null, 2));
      
      return {
        content: [
          {
            type: "text",
            text: `VS Code workspace created at: ${workspacePath}\\nOpen with: code "${workspacePath}"`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create VS Code workspace: ${error.message}`);
    }
  }

  async cleanupWatchers() {
    for (const [path, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    this.reloadCallbacks.clear();
    
    return {
      content: [
        {
          type: "text",
          text: "All file watchers cleaned up"
        }
      ]
    };
  }
}