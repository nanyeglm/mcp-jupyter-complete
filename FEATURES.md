# MCP Jupyter Complete - Feature Documentation

## Core Position-Based Operations

### `list_cells`
Lists all cells in a notebook with their indices, types, and content previews.

**Parameters:**
- `notebook_path` (string): Absolute path to the Jupyter notebook

**Returns:**
- Cell list with indices, types, and previews

**Example:**
```
[0] markdown: # Data Analysis Notebook...
[1] code: import pandas as pd...
[2] code: df = pd.read_csv('data.csv')...
```

### `get_cell_source`
Retrieves the complete source code of a specific cell.

**Parameters:**
- `notebook_path` (string): Path to notebook
- `cell_index` (integer): Zero-based cell index

**Returns:**
- Complete source code as string

### `edit_cell_source`
Replaces the content of a specific cell.

**Parameters:**
- `notebook_path` (string): Path to notebook
- `cell_index` (integer): Cell index to edit
- `new_source` (string): New source code/content

**Features:**
- Handles multi-line content properly
- Preserves cell type and metadata
- Automatic line ending normalization

### `insert_cell`
Inserts a new cell at a specific position.

**Parameters:**
- `notebook_path` (string): Path to notebook
- `position` (integer): Where to insert (0 = beginning)
- `cell_type` (string, optional): "code", "markdown", or "raw" (default: "code")
- `source` (string, optional): Initial content (default: empty)

**Features:**
- Automatic reindexing of subsequent cells
- Proper metadata initialization
- Code cells get execution_count and outputs arrays

### `delete_cell`
Removes a cell and automatically reindexes remaining cells.

**Parameters:**
- `notebook_path` (string): Path to notebook
- `cell_index` (integer): Cell index to delete

**Safety Features:**
- Prevents deletion of last remaining cell
- Validates index bounds
- Automatic reindexing

## Enhanced Operations

### `move_cell`
Moves a cell from one position to another.

**Parameters:**
- `notebook_path` (string): Path to notebook
- `from_index` (integer): Current cell position
- `to_index` (integer): Target position

**Use Cases:**
- Reorganizing notebook structure
- Moving code cells before/after markdown explanations
- Bulk reorganization workflows

### `convert_cell_type`
Converts a cell between different types while preserving content.

**Parameters:**
- `notebook_path` (string): Path to notebook
- `cell_index` (integer): Cell to convert
- `new_type` (string): Target type ("code", "markdown", "raw")

**Conversion Logic:**
- **To Code:** Adds execution_count (null) and outputs ([])
- **From Code:** Removes execution_count and outputs
- **Content:** Preserved exactly as-is
- **Metadata:** Preserved

### `bulk_edit_cells`
Performs multiple operations in a single atomic transaction.

**Parameters:**
- `notebook_path` (string): Path to notebook
- `operations` (array): List of operations to perform

**Operation Types:**
```javascript
{
  type: "edit",
  cell_index: 0,
  new_source: "new content"
}

{
  type: "delete", 
  cell_index: 1
}

{
  type: "convert",
  cell_index: 2,
  new_type: "markdown"
}
```

**Features:**
- Operations processed in safe order (deletions first, descending index)
- Partial success handling
- Detailed error reporting
- Atomic file writes

## VS Code Integration

### `trigger_vscode_reload`
Forces VS Code to detect notebook changes and prompt for reload.

**Parameters:**
- `notebook_path` (string): Path to notebook

**Mechanism:**
- Updates file modification time
- Triggers VS Code's file watcher
- Works with VS Code's built-in reload prompts

### File Watching (Advanced)
```javascript
// Setup automatic reload notifications
await vscode.setupFileWatcher(notebookPath, (path) => {
  console.log(`Notebook changed: ${path}`);
});
```

### VS Code Configuration Generation
```javascript
// Generate optimized VS Code settings
await vscode.generateVSCodeSettings(workspaceDir);
await vscode.generateVSCodeExtensions(workspaceDir);
await vscode.createVSCodeWorkspace(workspaceDir);
```

## Error Handling & Validation

### Index Validation
- Checks bounds: `0 <= index < cell_count`
- Provides helpful error messages with valid ranges
- Handles edge cases (empty notebooks)

### Cell Type Validation
- Validates against supported types: ["code", "markdown", "raw"]
- Case-sensitive matching
- Clear error messages for invalid types

### File Operations
- Handles permission errors
- Validates JSON format
- Atomic writes (backup + rename)
- Path existence checking

### Safety Features
- Prevents deletion of last cell
- Validates notebook format before writing
- Preserves original file on errors
- Detailed error context

## Performance Considerations

### Efficient Operations
- Single file read/write per operation
- Bulk operations minimize I/O
- In-memory processing
- Atomic file operations

### Memory Usage
- Streams large notebooks efficiently
- Minimal object copying
- Garbage collection friendly

### VS Code Integration
- Lightweight file touching
- Non-blocking operations
- Efficient file watching

## Advanced Use Cases

### Notebook Templates
```javascript
// Create standardized notebook structure
const operations = [
  { type: "edit", cell_index: 0, new_source: "# Project Title" },
  { type: "convert", cell_index: 1, new_type: "markdown" },
  { type: "edit", cell_index: 1, new_source: "## Setup" }
];
await bulk_edit_cells(notebookPath, operations);
```

### Code Refactoring
```javascript
// Convert explanatory code to markdown
await convert_cell_type(notebookPath, 2, "markdown");
await edit_cell_source(notebookPath, 2, "**Note:** This explains the algorithm");
```

### Notebook Merging
```javascript
// Combine notebooks by inserting cells
for (let i = 0; i < sourceCells.length; i++) {
  await insert_cell(targetPath, insertPosition + i, 
                   sourceCells[i].type, sourceCells[i].source);
}
```

## Integration Examples

### With Claude Code
The MCP server works seamlessly with Claude Code for:
- Automated notebook generation
- Code review and refactoring  
- Documentation generation
- Data analysis workflows

### With VS Code
- Real-time collaboration
- Automatic reload on external changes
- Integrated debugging
- Extension ecosystem