import fs from 'fs-extra';
import path from 'path';
import { ServiceManager } from '@jupyterlab/services';
import { PageConfig } from '@jupyterlab/coreutils';

export class JupyterHandler {
  constructor() {
    this.supportedCellTypes = ['code', 'markdown', 'raw'];
    this.kernelManager = null;
    this.sessionManager = null;
    this.kernelSessions = new Map(); // Map notebook paths to kernel sessions
    this.initializeServices();
  }

  async initializeServices() {
    try {
      // Set up minimal page config for Jupyter services
      PageConfig.setOption('baseUrl', 'http://localhost:8888/');
      PageConfig.setOption('wsUrl', 'ws://localhost:8888/');
      
      // Create service manager
      this.serviceManager = new ServiceManager();
      this.kernelManager = this.serviceManager.kernels;
      this.sessionManager = this.serviceManager.sessions;
      
      console.error('[Jupyter Handler] Services initialized');
    } catch (error) {
      console.error('[Jupyter Handler] Failed to initialize services:', error.message);
      // Continue without kernel support if initialization fails
    }
  }

  async getKernelSession(notebookPath) {
    if (!this.sessionManager) {
      throw new Error('Jupyter services not initialized. Please ensure Jupyter server is running.');
    }

    // Check if we already have a session for this notebook
    if (this.kernelSessions.has(notebookPath)) {
      const session = this.kernelSessions.get(notebookPath);
      if (session.kernel && !session.kernel.isDisposed) {
        return session;
      } else {
        // Clean up disposed session
        this.kernelSessions.delete(notebookPath);
      }
    }

    try {
      // Create a new session
      const session = await this.sessionManager.startNew({
        path: notebookPath,
        type: 'notebook',
        name: path.basename(notebookPath),
        kernel: { name: 'python3' }
      });

      this.kernelSessions.set(notebookPath, session);
      console.error(`[Jupyter Handler] Created new kernel session for ${notebookPath}`);
      return session;
    } catch (error) {
      throw new Error(`Failed to create kernel session: ${error.message}`);
    }
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

  async readNotebookWithOutputs(notebookPath) {
    const notebook = await this.readNotebook(notebookPath);
    
    const cellsContent = notebook.cells.map((cell, index) => {
      const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      let content = `Cell with ID: ${cell.id || index}\\n${source}`;
      
      // Add outputs if it's a code cell with outputs
      if (cell.cell_type === 'code' && cell.outputs && cell.outputs.length > 0) {
        content += '\\nOutput of cell ' + (cell.id || index) + ':';
        
        for (const output of cell.outputs) {
          if (output.output_type === 'stream') {
            const text = Array.isArray(output.text) ? output.text.join('') : output.text;
            content += '\\n' + text;
          } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
            if (output.data) {
              if (output.data['text/plain']) {
                const text = Array.isArray(output.data['text/plain']) 
                  ? output.data['text/plain'].join('')
                  : output.data['text/plain'];
                content += '\\n' + text;
              }
              if (output.data['image/png']) {
                content += '\\n[Image output available]';
              }
            }
          } else if (output.output_type === 'error') {
            content += '\\nError: ' + output.ename + ': ' + output.evalue;
          }
        }
      }
      
      return content;
    });

    return {
      content: [
        {
          type: "text",
          text: cellsContent.join('\\n\\n')
        }
      ]
    };
  }

  async executeCell(notebookPath, cellId) {
    try {
      const notebook = await this.readNotebook(notebookPath);
      
      // Find cell by ID or index
      let cellIndex = -1;
      let cell = null;
      
      if (typeof cellId === 'string') {
        // Search by cell ID
        cellIndex = notebook.cells.findIndex(c => c.id === cellId);
        if (cellIndex === -1) {
          throw new Error(`Cell with ID '${cellId}' not found`);
        }
      } else {
        // Treat as index
        cellIndex = cellId;
        this.validateCellIndex(notebook.cells, cellIndex);
      }
      
      cell = notebook.cells[cellIndex];
      
      if (cell.cell_type !== 'code') {
        throw new Error(`Cell ${cellId} is not a code cell (type: ${cell.cell_type})`);
      }

      // Get kernel session
      const session = await this.getKernelSession(notebookPath);
      const kernel = session.kernel;

      if (!kernel) {
        throw new Error('No kernel available for execution');
      }

      // Get cell source
      const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      
      if (!source.trim()) {
        return {
          content: [
            {
              type: "text",
              text: "Cell is empty, nothing to execute"
            }
          ]
        };
      }

      // Execute the code
      const future = kernel.requestExecute({ code: source });
      const outputs = [];
      let executionCount = null;

      // Collect outputs
      future.onIOPub = (msg) => {
        if (msg.header.msg_type === 'execute_result' || 
            msg.header.msg_type === 'display_data' ||
            msg.header.msg_type === 'stream' ||
            msg.header.msg_type === 'error') {
          outputs.push(msg.content);
        }
        
        if (msg.header.msg_type === 'execute_input') {
          executionCount = msg.content.execution_count;
        }
      };

      // Wait for execution to complete
      const reply = await future.done;
      
      // Update cell in notebook
      cell.execution_count = executionCount;
      cell.outputs = outputs.map(output => {
        // Convert Jupyter message format to notebook format
        if (output.output_type) {
          return output;
        } else {
          // Handle different message types
          const notebookOutput = {
            output_type: reply.content.status === 'error' ? 'error' : 'execute_result'
          };
          
          if (output.data) {
            notebookOutput.data = output.data;
            notebookOutput.metadata = output.metadata || {};
            notebookOutput.execution_count = executionCount;
          } else if (output.text) {
            notebookOutput.output_type = 'stream';
            notebookOutput.name = 'stdout';
            notebookOutput.text = output.text;
          }
          
          return notebookOutput;
        }
      });

      // Save updated notebook
      await this.writeNotebook(notebookPath, notebook);

      // Format output for display
      let outputText = `Executed cell ${cellId}\\n`;
      
      if (reply.content.status === 'error') {
        outputText += `Error: ${reply.content.ename}: ${reply.content.evalue}`;
      } else {
        outputText += `Execution completed successfully`;
        
        if (outputs.length > 0) {
          outputText += '\\n\\nOutputs:';
          outputs.forEach((output, i) => {
            if (output.text) {
              outputText += `\\n${Array.isArray(output.text) ? output.text.join('') : output.text}`;
            } else if (output.data && output.data['text/plain']) {
              const text = Array.isArray(output.data['text/plain']) 
                ? output.data['text/plain'].join('')
                : output.data['text/plain'];
              outputText += `\\n${text}`;
            }
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: outputText
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing cell: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async addCell(notebookPath, source = '', cellType = 'code', position = null) {
    const notebook = await this.readNotebook(notebookPath);
    
    // If position not specified, add at the end
    const insertPosition = position !== null ? position : notebook.cells.length;
    
    return await this.insertCell(notebookPath, insertPosition, cellType, source);
  }

  async editCell(notebookPath, cellId, newSource) {
    const notebook = await this.readNotebook(notebookPath);
    
    // Find cell by ID or treat as index
    let cellIndex = -1;
    
    if (typeof cellId === 'string') {
      // Search by cell ID
      cellIndex = notebook.cells.findIndex(c => c.id === cellId);
      if (cellIndex === -1) {
        throw new Error(`Cell with ID '${cellId}' not found`);
      }
    } else {
      // Treat as index
      cellIndex = cellId;
    }
    
    return await this.editCellSource(notebookPath, cellIndex, newSource);
  }

  // Cleanup method to dispose kernel sessions
  async cleanup() {
    for (const [notebookPath, session] of this.kernelSessions) {
      try {
        if (session && !session.isDisposed) {
          await session.dispose();
          console.error(`[Jupyter Handler] Disposed session for ${notebookPath}`);
        }
      } catch (error) {
        console.error(`[Jupyter Handler] Error disposing session for ${notebookPath}:`, error.message);
      }
    }
    this.kernelSessions.clear();
  }
}