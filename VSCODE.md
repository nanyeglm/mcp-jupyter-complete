# VS Code Integration Guide

## Setup Instructions

### 1. Install Required Extensions

Install these VS Code extensions for optimal Jupyter experience:

```bash
# Core extensions
code --install-extension ms-python.python
code --install-extension ms-toolsai.jupyter
code --install-extension ms-toolsai.jupyter-keymap
code --install-extension ms-toolsai.jupyter-renderers

# Code quality
code --install-extension ms-python.black-formatter
code --install-extension charliermarsh.ruff
```

### 2. Configure VS Code Settings

Add to your VS Code settings (`settings.json`):

```json
{
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
}
```

### 3. Setup MCP Server

Configure the MCP server in your `~/.claude.json`:

```json
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "node",
      "args": ["/path/to/mcp-jupyter-complete/src/index.js"]
    }
  }
}
```

## Auto-Reload Configuration

### Method 1: Automatic Reload (Recommended)

Enable automatic file reload in VS Code:

```json
{
  "files.watcherExclude": {
    "**/.ipynb_checkpoints/**": true
  },
  "notebook.experimental.repl.enableReload": true
}
```

### Method 2: Manual Reload Trigger

Use the MCP trigger function:

```javascript
// In Claude Code or MCP client
await mcp.call("trigger_vscode_reload", {
  notebook_path: "/path/to/notebook.ipynb"
});
```

## Workflow Integration

### Basic Workflow

1. **Open notebook in VS Code**
   ```bash
   code notebook.ipynb
   ```

2. **Use Claude Code with MCP for editing**
   - Make changes via MCP tools
   - VS Code detects changes automatically
   - Accept reload prompt when shown

3. **Continue editing in VS Code**
   - Changes sync back to file system
   - MCP tools see updates immediately

### Advanced Workflow

1. **Setup workspace**
   ```javascript
   // Generate VS Code workspace configuration
   await mcp.call("create_vscode_workspace", {
     workspace_dir: "/path/to/project",
     notebook_paths: ["analysis.ipynb", "model.ipynb"]
   });
   ```

2. **Open workspace**
   ```bash
   code jupyter-workspace.code-workspace
   ```

3. **Hybrid editing**
   - Structure changes via MCP (insert/move cells)
   - Content editing in VS Code
   - Real-time synchronization

## File Watching Setup

### Automatic File Watcher

```javascript
// Setup file watcher for automatic reload notifications
await mcp.call("setup_file_watcher", {
  notebook_path: "/path/to/notebook.ipynb",
  callback: (path) => {
    console.log(`Notebook modified: ${path}`);
    // Trigger VS Code reload
    mcp.call("trigger_vscode_reload", { notebook_path: path });
  }
});
```

### Manual File Watching

Use VS Code's built-in file watcher:

1. **Enable file watching**
   ```json
   {
     "files.watcherExclude": {
       "**/.ipynb_checkpoints/**": true
     }
   }
   ```

2. **Monitor changes**
   VS Code automatically detects external changes and prompts for reload.

## Troubleshooting

### Issue: VS Code Not Detecting Changes

**Solution 1: Check file watcher exclusions**
```json
{
  "files.watcherExclude": {
    "**/.ipynb_checkpoints/**": true
  }
}
```

**Solution 2: Manual reload trigger**
```javascript
await mcp.call("trigger_vscode_reload", {
  notebook_path: "/absolute/path/to/notebook.ipynb"
});
```

**Solution 3: Restart VS Code**
Sometimes file watchers need a restart.

### Issue: Reload Prompt Not Appearing

**Check settings:**
```json
{
  "files.promptToSaveConflictingFile": true,
  "diffEditor.ignoreTrimWhitespace": false
}
```

**Manual reload:**
- Command Palette: `Developer: Reload Window`
- Or: `Ctrl+Shift+P` → "Reload Window"

### Issue: Notebook Format Errors

**Validate JSON:**
```bash
python -m json.tool notebook.ipynb
```

**Check cell structure:**
```javascript
// Verify notebook structure
await mcp.call("list_cells", {
  notebook_path: "/path/to/notebook.ipynb"
});
```

## Performance Optimization

### Large Notebooks

For notebooks with many cells:

```json
{
  "notebook.output.textLineLimit": 30,
  "notebook.cellToolbarLocation": {
    "default": "hidden"
  },
  "notebook.experimental.outputScrolling": true
}
```

### File Watching Performance

Exclude unnecessary directories:

```json
{
  "files.watcherExclude": {
    "**/.git/**": true,
    "**/node_modules/**": true,
    "**/.ipynb_checkpoints/**": true,
    "**/venv/**": true,
    "**/__pycache__/**": true
  }
}
```

## Integration Examples

### Example 1: Live Documentation Updates

```javascript
// Update documentation cells while coding
async function updateDocumentation() {
  // Insert explanation cell
  await mcp.call("insert_cell", {
    notebook_path: "analysis.ipynb",
    position: 2,
    cell_type: "markdown",
    source: "## Data Preprocessing\n\nThis section handles data cleaning and transformation."
  });
  
  // Trigger VS Code reload
  await mcp.call("trigger_vscode_reload", {
    notebook_path: "analysis.ipynb"
  });
}
```

### Example 2: Code Refactoring

```javascript
// Convert code cell to markdown explanation
async function convertToExplanation(cellIndex) {
  // Get current code
  const source = await mcp.call("get_cell_source", {
    notebook_path: "notebook.ipynb",
    cell_index: cellIndex
  });
  
  // Convert to markdown with code block
  await mcp.call("convert_cell_type", {
    notebook_path: "notebook.ipynb", 
    cell_index: cellIndex,
    new_type: "markdown"
  });
  
  await mcp.call("edit_cell_source", {
    notebook_path: "notebook.ipynb",
    cell_index: cellIndex,
    new_source: `### Code Explanation\n\n\`\`\`python\n${source}\n\`\`\`\n\nThis code performs...`
  });
  
  // Reload in VS Code
  await mcp.call("trigger_vscode_reload", {
    notebook_path: "notebook.ipynb"
  });
}
```

### Example 3: Template Application

```javascript
// Apply notebook template
async function applyTemplate(notebookPath) {
  const operations = [
    {
      type: "edit",
      cell_index: 0,
      new_source: "# Project Analysis\n\n**Date:** " + new Date().toLocaleDateString()
    },
    {
      type: "insert",
      position: 1,
      cell_type: "markdown",
      source: "## Imports and Setup"
    },
    {
      type: "insert",
      position: 2,
      cell_type: "code",
      source: "import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt"
    }
  ];
  
  await mcp.call("bulk_edit_cells", {
    notebook_path: notebookPath,
    operations: operations
  });
  
  await mcp.call("trigger_vscode_reload", {
    notebook_path: notebookPath
  });
}
```

## Best Practices

1. **Always use absolute paths** for reliable file operations
2. **Test reload mechanism** before production workflows
3. **Use bulk operations** for multiple changes
4. **Monitor file watchers** for performance issues
5. **Keep VS Code updated** for latest Jupyter features
6. **Use workspace files** for project organization
7. **Configure auto-save carefully** to avoid conflicts