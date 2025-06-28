# MCP Jupyter Complete

A comprehensive Model Context Protocol (MCP) server for Jupyter notebook manipulation with position-based operations and VS Code integration.

## Features

### 🎯 Position-Based Operations
- **`list_cells`** - List all cells with indices and type information
- **`get_cell_source`** - Get source code of specific cells by index
- **`edit_cell_source`** - Edit cell content by index
- **`insert_cell`** - Insert new cells at specific positions
- **`delete_cell`** - Delete cells by index with automatic reindexing

### 🚀 Enhanced Operations
- **`move_cell`** - Move cells between positions
- **`convert_cell_type`** - Convert between code/markdown/raw cells
- **`bulk_edit_cells`** - Perform multiple operations in a single call

### 🔧 VS Code Integration
- **`trigger_vscode_reload`** - Force VS Code to reload notebook files
- File watcher support for automatic reloading
- VS Code workspace and settings generation
- Extension recommendations for optimal Jupyter experience

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tofunori/mcp-jupyter-complete.git
   cd mcp-jupyter-complete
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Make executable (optional):**
   ```bash
   npm link
   ```

## Configuration

Add to your `~/.claude.json` configuration:

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

Or if installed globally via npm:

```json
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "mcp-jupyter-complete"
    }
  }
}
```

## Usage Examples

### Basic Cell Operations

```javascript
// List all cells
await mcp.call("list_cells", {
  notebook_path: "/path/to/notebook.ipynb"
});

// Get cell content
await mcp.call("get_cell_source", {
  notebook_path: "/path/to/notebook.ipynb",
  cell_index: 0
});

// Edit a cell
await mcp.call("edit_cell_source", {
  notebook_path: "/path/to/notebook.ipynb",
  cell_index: 1,
  new_source: "print('Hello World!')"
});
```

### Advanced Operations

```javascript
// Insert a new markdown cell
await mcp.call("insert_cell", {
  notebook_path: "/path/to/notebook.ipynb",
  position: 2,
  cell_type: "markdown",
  source: "# New Section\\n\\nThis is a new markdown cell."
});

// Move a cell
await mcp.call("move_cell", {
  notebook_path: "/path/to/notebook.ipynb",
  from_index: 3,
  to_index: 1
});

// Bulk operations
await mcp.call("bulk_edit_cells", {
  notebook_path: "/path/to/notebook.ipynb",
  operations: [
    {
      type: "edit",
      cell_index: 0,
      new_source: "# Updated title"
    },
    {
      type: "convert",
      cell_index: 1,
      new_type: "markdown"
    }
  ]
});
```

### VS Code Integration

```javascript
// Trigger VS Code reload
await mcp.call("trigger_vscode_reload", {
  notebook_path: "/path/to/notebook.ipynb"
});
```

## VS Code Setup

For optimal VS Code integration:

1. **Install recommended extensions:**
   - Python
   - Jupyter
   - Jupyter Keymap
   - Jupyter Renderers

2. **Configure auto-reload:**
   Add to VS Code settings:
   ```json
   {
     "files.watcherExclude": {
       "**/.ipynb_checkpoints/**": true
     },
     "notebook.diffEditor.ignoreTrimWhitespace": false
   }
   ```

3. **Use with Claude Code:**
   When using with Claude Code, notebook changes made via MCP will automatically trigger VS Code to prompt for reload.

## API Reference

### Core Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `list_cells` | `notebook_path` | Lists all cells with indices |
| `get_cell_source` | `notebook_path`, `cell_index` | Gets cell source code |
| `edit_cell_source` | `notebook_path`, `cell_index`, `new_source` | Edits cell content |
| `insert_cell` | `notebook_path`, `position`, `cell_type?`, `source?` | Inserts new cell |
| `delete_cell` | `notebook_path`, `cell_index` | Deletes cell |

### Enhanced Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `move_cell` | `notebook_path`, `from_index`, `to_index` | Moves cell position |
| `convert_cell_type` | `notebook_path`, `cell_index`, `new_type` | Converts cell type |
| `bulk_edit_cells` | `notebook_path`, `operations[]` | Bulk operations |

### VS Code Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `trigger_vscode_reload` | `notebook_path` | Forces VS Code reload |

## Cell Types

Supported cell types:
- **`code`** - Python/executable code cells
- **`markdown`** - Markdown text cells  
- **`raw`** - Raw text cells

## Error Handling

The server provides detailed error messages for:
- Invalid cell indices
- File read/write permissions
- Malformed notebook JSON
- Invalid cell type conversions

## Development

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Development Mode

```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- Position-based cell operations
- VS Code integration
- Bulk operations support
- Comprehensive error handling