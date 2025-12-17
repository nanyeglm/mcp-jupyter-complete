# MCP Jupyter Complete

A comprehensive Model Context Protocol (MCP) server for Jupyter notebook manipulation with position-based operations and VS Code integration.

> **Fork 说明**: 本仓库 fork 自 [tofunori/mcp-jupyter-complete](https://github.com/tofunori/mcp-jupyter-complete)，添加了中文部署文档。

---

## 📚 部署文档导航

根据你的使用场景，选择合适的文档：

| 场景 | 推荐文档 | 说明 |
|------|----------|------|
| **仅使用 mcp-jupyter-complete** | [MCP Jupyter Complete 部署指南](MCP%20Jupyter%20Complete%20部署指南.md) | 单服务完整部署，包含环境创建、服务配置、客户端设置 |
| **同时使用两个 MCP 服务** | [Jupyter-MCP-双服务完整部署指南](Jupyter-MCP-双服务完整部署指南.md) | 同时部署 mcp-jupyter-complete 和 jupyter-mcp-server |

### 两个 MCP 服务的区别

| 特性 | mcp-jupyter-complete | [jupyter-mcp-server](https://github.com/nanyeglm/jupyter-mcp-server) |
|------|---------------------|------------------|
| **实现语言** | Node.js | Python |
| **主要功能** | Notebook 文件编辑（Cell 增删改查） | Notebook 实时执行与交互 |
| **是否需要 Jupyter 运行** | 可选（仅编辑文件时不需要） | 必须（需要连接 Jupyter Server） |
| **适用场景** | 批量编辑 Notebook 结构 | 实时执行代码、查看输出 |

**推荐**: 两个服务配合使用，功能互补。

---

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
