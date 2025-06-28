#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

import { JupyterHandler } from "./jupyter-handler.js";
import { VSCodeIntegration } from "./vscode-integration.js";

class JupyterCompleteServer {
  constructor() {
    this.server = new Server(
      {
        name: "mcp-jupyter-complete",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.jupyterHandler = new JupyterHandler();
    this.vscodeIntegration = new VSCodeIntegration();
    
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Position-based operations
          {
            name: "list_cells",
            description: "List all cells in a Jupyter notebook with their indices and types",
            inputSchema: {
              type: "object",
              properties: {
                notebook_path: {
                  type: "string",
                  description: "Absolute path to the Jupyter notebook file"
                }
              },
              required: ["notebook_path"]
            }
          },
          {
            name: "get_cell_source",
            description: "Get the source code of a specific cell by index",
            inputSchema: {
              type: "object",
              properties: {
                notebook_path: {
                  type: "string",
                  description: "Absolute path to the Jupyter notebook file"
                },
                cell_index: {
                  type: "integer",
                  description: "Zero-based index of the cell"
                }
              },
              required: ["notebook_path", "cell_index"]
            }
          },
          {
            name: "edit_cell_source",
            description: "Edit the source code of a specific cell by index",
            inputSchema: {
              type: "object",
              properties: {
                notebook_path: {
                  type: "string",
                  description: "Absolute path to the Jupyter notebook file"
                },
                cell_index: {
                  type: "integer",
                  description: "Zero-based index of the cell"
                },
                new_source: {
                  type: "string",
                  description: "New source code for the cell"
                }
              },
              required: ["notebook_path", "cell_index", "new_source"]
            }
          },
          {
            name: "insert_cell",
            description: "Insert a new cell at a specific position",
            inputSchema: {
              type: "object",
              properties: {
                notebook_path: {
                  type: "string",
                  description: "Absolute path to the Jupyter notebook file"
                },
                position: {
                  type: "integer",
                  description: "Position to insert the cell (0-based)"
                },
                cell_type: {
                  type: "string",
                  enum: ["code", "markdown", "raw"],
                  default: "code",
                  description: "Type of cell to create"
                },
                source: {
                  type: "string",
                  default: "",
                  description: "Initial source code/content for the cell"
                }
              },
              required: ["notebook_path", "position"]
            }
          },
          {
            name: "delete_cell",
            description: "Delete a cell by index",
            inputSchema: {
              type: "object",
              properties: {
                notebook_path: {
                  type: "string",
                  description: "Absolute path to the Jupyter notebook file"
                },
                cell_index: {
                  type: "integer",
                  description: "Zero-based index of the cell to delete"
                }
              },
              required: ["notebook_path", "cell_index"]
            }
          },
          // Enhanced operations
          {
            name: "move_cell",
            description: "Move a cell from one position to another",
            inputSchema: {
              type: "object",
              properties: {
                notebook_path: {
                  type: "string",
                  description: "Absolute path to the Jupyter notebook file"
                },
                from_index: {
                  type: "integer",
                  description: "Current index of the cell"
                },
                to_index: {
                  type: "integer",
                  description: "Target index for the cell"
                }
              },
              required: ["notebook_path", "from_index", "to_index"]
            }
          },
          {
            name: "convert_cell_type",
            description: "Convert a cell from one type to another",
            inputSchema: {
              type: "object",
              properties: {
                notebook_path: {
                  type: "string",
                  description: "Absolute path to the Jupyter notebook file"
                },
                cell_index: {
                  type: "integer",
                  description: "Zero-based index of the cell"
                },
                new_type: {
                  type: "string",
                  enum: ["code", "markdown", "raw"],
                  description: "New cell type"
                }
              },
              required: ["notebook_path", "cell_index", "new_type"]
            }
          },
          {
            name: "bulk_edit_cells",
            description: "Perform bulk operations on multiple cells",
            inputSchema: {
              type: "object",
              properties: {
                notebook_path: {
                  type: "string",
                  description: "Absolute path to the Jupyter notebook file"
                },
                operations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["edit", "delete", "convert"]
                      },
                      cell_index: {
                        type: "integer"
                      },
                      new_source: {
                        type: "string"
                      },
                      new_type: {
                        type: "string",
                        enum: ["code", "markdown", "raw"]
                      }
                    },
                    required: ["type", "cell_index"]
                  }
                }
              },
              required: ["notebook_path", "operations"]
            }
          },
          // VS Code integration
          {
            name: "trigger_vscode_reload",
            description: "Trigger VS Code to reload the notebook file",
            inputSchema: {
              type: "object",
              properties: {
                notebook_path: {
                  type: "string",
                  description: "Absolute path to the Jupyter notebook file"
                }
              },
              required: ["notebook_path"]
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "list_cells":
            return await this.jupyterHandler.listCells(args.notebook_path);
          
          case "get_cell_source":
            return await this.jupyterHandler.getCellSource(args.notebook_path, args.cell_index);
          
          case "edit_cell_source":
            return await this.jupyterHandler.editCellSource(
              args.notebook_path, 
              args.cell_index, 
              args.new_source
            );
          
          case "insert_cell":
            return await this.jupyterHandler.insertCell(
              args.notebook_path, 
              args.position, 
              args.cell_type || "code", 
              args.source || ""
            );
          
          case "delete_cell":
            return await this.jupyterHandler.deleteCell(args.notebook_path, args.cell_index);
          
          case "move_cell":
            return await this.jupyterHandler.moveCell(
              args.notebook_path, 
              args.from_index, 
              args.to_index
            );
          
          case "convert_cell_type":
            return await this.jupyterHandler.convertCellType(
              args.notebook_path, 
              args.cell_index, 
              args.new_type
            );
          
          case "bulk_edit_cells":
            return await this.jupyterHandler.bulkEditCells(
              args.notebook_path, 
              args.operations
            );
          
          case "trigger_vscode_reload":
            return await this.vscodeIntegration.triggerReload(args.notebook_path);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP Jupyter Complete server running on stdio");
  }
}

const server = new JupyterCompleteServer();
server.run().catch(console.error);