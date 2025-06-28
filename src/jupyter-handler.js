import fs from 'fs-extra';
import path from 'path';

export class JupyterHandler {
  constructor() {
    this.supportedCellTypes = ['code', 'markdown', 'raw'];
  }

  async readNotebook(notebookPath) {
    try {
      const content = await fs.readFile(notebookPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read notebook: ${error.message}`);
    }
  }

  async writeNotebook(notebookPath, notebook) {
    try {
      await fs.writeFile(notebookPath, JSON.stringify(notebook, null, 2));
    } catch (error) {
      throw new Error(`Failed to write notebook: ${error.message}`);
    }
  }

  validateCellIndex(cells, index) {
    if (index < 0 || index >= cells.length) {
      throw new Error(`Invalid cell index ${index}. Notebook has ${cells.length} cells (indices 0-${cells.length - 1})`);
    }
  }

  validateCellType(cellType) {
    if (!this.supportedCellTypes.includes(cellType)) {
      throw new Error(`Invalid cell type '${cellType}'. Supported types: ${this.supportedCellTypes.join(', ')}`);
    }
  }

  async listCells(notebookPath) {
    const notebook = await this.readNotebook(notebookPath);
    const cellsInfo = notebook.cells.map((cell, index) => {
      const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      const preview = source.length > 100 ? source.substring(0, 100) + '...' : source;
      
      return {
        index,
        type: cell.cell_type,
        preview: preview.replace(/\\n/g, ' ')
      };
    });

    return {
      content: [
        {
          type: "text",
          text: `Notebook: ${notebookPath}\\nTotal cells: ${cellsInfo.length}\\n\\n${
            cellsInfo.map(cell => 
              `[${cell.index}] ${cell.type}: ${cell.preview}`
            ).join('\\n')
          }`
        }
      ]
    };
  }

  async getCellSource(notebookPath, cellIndex) {
    const notebook = await this.readNotebook(notebookPath);
    this.validateCellIndex(notebook.cells, cellIndex);
    
    const cell = notebook.cells[cellIndex];
    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
    
    return {
      content: [
        {
          type: "text",
          text: source
        }
      ]
    };
  }

  async editCellSource(notebookPath, cellIndex, newSource) {
    const notebook = await this.readNotebook(notebookPath);
    this.validateCellIndex(notebook.cells, cellIndex);
    
    // Convert string to array format if needed
    const sourceArray = newSource.split('\\n').map(line => line + '\\n');
    if (sourceArray.length > 0 && sourceArray[sourceArray.length - 1] === '\\n') {
      sourceArray[sourceArray.length - 1] = sourceArray[sourceArray.length - 1].slice(0, -1);
    }
    
    notebook.cells[cellIndex].source = sourceArray;
    await this.writeNotebook(notebookPath, notebook);
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated cell ${cellIndex}`
        }
      ]
    };
  }

  async insertCell(notebookPath, position, cellType = 'code', source = '') {
    const notebook = await this.readNotebook(notebookPath);
    this.validateCellType(cellType);
    
    if (position < 0 || position > notebook.cells.length) {
      throw new Error(`Invalid position ${position}. Must be between 0 and ${notebook.cells.length}`);
    }
    
    const sourceArray = source ? source.split('\\n').map(line => line + '\\n') : [''];
    if (sourceArray.length > 0 && sourceArray[sourceArray.length - 1] === '\\n') {
      sourceArray[sourceArray.length - 1] = sourceArray[sourceArray.length - 1].slice(0, -1);
    }
    
    const newCell = {
      cell_type: cellType,
      metadata: {},
      source: sourceArray
    };
    
    if (cellType === 'code') {
      newCell.execution_count = null;
      newCell.outputs = [];
    }
    
    notebook.cells.splice(position, 0, newCell);
    await this.writeNotebook(notebookPath, notebook);
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully inserted ${cellType} cell at position ${position}`
        }
      ]
    };
  }

  async deleteCell(notebookPath, cellIndex) {
    const notebook = await this.readNotebook(notebookPath);
    this.validateCellIndex(notebook.cells, cellIndex);
    
    if (notebook.cells.length === 1) {
      throw new Error("Cannot delete the last remaining cell in the notebook");
    }
    
    notebook.cells.splice(cellIndex, 1);
    await this.writeNotebook(notebookPath, notebook);
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted cell ${cellIndex}`
        }
      ]
    };
  }

  async moveCell(notebookPath, fromIndex, toIndex) {
    const notebook = await this.readNotebook(notebookPath);
    this.validateCellIndex(notebook.cells, fromIndex);
    
    if (toIndex < 0 || toIndex >= notebook.cells.length) {
      throw new Error(`Invalid target index ${toIndex}. Must be between 0 and ${notebook.cells.length - 1}`);
    }
    
    const [movedCell] = notebook.cells.splice(fromIndex, 1);
    notebook.cells.splice(toIndex, 0, movedCell);
    await this.writeNotebook(notebookPath, notebook);
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully moved cell from index ${fromIndex} to ${toIndex}`
        }
      ]
    };
  }

  async convertCellType(notebookPath, cellIndex, newType) {
    const notebook = await this.readNotebook(notebookPath);
    this.validateCellIndex(notebook.cells, cellIndex);
    this.validateCellType(newType);
    
    const cell = notebook.cells[cellIndex];
    const oldType = cell.cell_type;
    
    if (oldType === newType) {
      return {
        content: [
          {
            type: "text",
            text: `Cell ${cellIndex} is already of type '${newType}'`
          }
        ]
      };
    }
    
    // Convert cell type
    cell.cell_type = newType;
    
    // Handle type-specific properties
    if (newType === 'code') {
      cell.execution_count = null;
      cell.outputs = [];
    } else {
      // Remove code-specific properties for non-code cells
      delete cell.execution_count;
      delete cell.outputs;
    }
    
    await this.writeNotebook(notebookPath, notebook);
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully converted cell ${cellIndex} from '${oldType}' to '${newType}'`
        }
      ]
    };
  }

  async bulkEditCells(notebookPath, operations) {
    const notebook = await this.readNotebook(notebookPath);
    let successCount = 0;
    const errors = [];
    
    // Sort operations by index in descending order for deletions
    const sortedOps = operations.sort((a, b) => {
      if (a.type === 'delete' && b.type !== 'delete') return -1;
      if (a.type !== 'delete' && b.type === 'delete') return 1;
      return b.cell_index - a.cell_index;
    });
    
    for (const op of sortedOps) {
      try {
        switch (op.type) {
          case 'edit':
            if (op.cell_index < 0 || op.cell_index >= notebook.cells.length) {
              throw new Error(`Invalid cell index ${op.cell_index}`);
            }
            const sourceArray = op.new_source.split('\\n').map(line => line + '\\n');
            if (sourceArray.length > 0 && sourceArray[sourceArray.length - 1] === '\\n') {
              sourceArray[sourceArray.length - 1] = sourceArray[sourceArray.length - 1].slice(0, -1);
            }
            notebook.cells[op.cell_index].source = sourceArray;
            break;
            
          case 'delete':
            if (op.cell_index < 0 || op.cell_index >= notebook.cells.length) {
              throw new Error(`Invalid cell index ${op.cell_index}`);
            }
            notebook.cells.splice(op.cell_index, 1);
            break;
            
          case 'convert':
            if (op.cell_index < 0 || op.cell_index >= notebook.cells.length) {
              throw new Error(`Invalid cell index ${op.cell_index}`);
            }
            this.validateCellType(op.new_type);
            const cell = notebook.cells[op.cell_index];
            cell.cell_type = op.new_type;
            if (op.new_type === 'code') {
              cell.execution_count = null;
              cell.outputs = [];
            } else {
              delete cell.execution_count;
              delete cell.outputs;
            }
            break;
            
          default:
            throw new Error(`Unknown operation type: ${op.type}`);
        }
        successCount++;
      } catch (error) {
        errors.push(`Operation ${op.type} on cell ${op.cell_index}: ${error.message}`);
      }
    }
    
    await this.writeNotebook(notebookPath, notebook);
    
    const resultText = [
      `Bulk operation completed: ${successCount}/${operations.length} operations successful`
    ];
    
    if (errors.length > 0) {
      resultText.push(`\\nErrors:\\n${errors.join('\\n')}`);
    }
    
    return {
      content: [
        {
          type: "text",
          text: resultText.join('\\n')
        }
      ]
    };
  }
}