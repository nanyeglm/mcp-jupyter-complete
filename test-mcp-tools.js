#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

class MCPToolTester {
  constructor() {
    this.testNotebook = '/tmp/test-notebook.ipynb';
    this.mcpCommand = [
      'node', 'src/index.js'
    ];
    this.env = {
      ...process.env,
      JUPYTER_URL: 'http://localhost:8888',
      JUPYTER_TOKEN: 'ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359'
    };
    this.testResults = [];
  }

  async createTestNotebook() {
    const notebook = {
      cells: [
        {
          cell_type: "markdown",
          metadata: {},
          source: ["# Test Notebook\n", "This is a test notebook for MCP tools."]
        },
        {
          cell_type: "code",
          execution_count: null,
          metadata: {},
          outputs: [],
          source: ["print('Hello, World!')"]
        }
      ],
      metadata: {
        kernelspec: {
          display_name: "MCP Jupyter Complete",
          language: "python",
          name: "mcp-jupyter-complete"
        },
        language_info: {
          name: "python",
          version: "3.10.0"
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    };

    await fs.writeFile(this.testNotebook, JSON.stringify(notebook, null, 2));
    console.log(`✅ Created test notebook: ${this.testNotebook}`);
  }

  async callMCPTool(toolName, args) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      };

      const process = spawn('node', ['src/index.js'], {
        env: this.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        } else {
          try {
            // Parse the JSON response
            const lines = stdout.trim().split('\n');
            const responseLine = lines.find(line => {
              try {
                const parsed = JSON.parse(line);
                return parsed.id === 1;
              } catch {
                return false;
              }
            });

            if (responseLine) {
              resolve(JSON.parse(responseLine));
            } else {
              reject(new Error(`No valid response found in: ${stdout}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}\nOutput: ${stdout}`));
          }
        }
      });

      process.stdin.write(JSON.stringify(request) + '\n');
      process.stdin.end();
    });
  }

  async testTool(toolName, args, description) {
    console.log(`\n🧪 Testing ${toolName}: ${description}`);
    try {
      const result = await this.callMCPTool(toolName, args);
      
      if (result.error) {
        console.log(`❌ ${toolName} failed: ${result.error.message}`);
        this.testResults.push({ tool: toolName, status: 'FAILED', error: result.error.message });
        return false;
      } else {
        console.log(`✅ ${toolName} succeeded`);
        if (result.result && result.result.content) {
          const text = result.result.content[0]?.text;
          if (text && text.length < 200) {
            console.log(`   Result: ${text.substring(0, 100)}...`);
          }
        }
        this.testResults.push({ tool: toolName, status: 'PASSED' });
        return true;
      }
    } catch (error) {
      console.log(`❌ ${toolName} error: ${error.message}`);
      this.testResults.push({ tool: toolName, status: 'ERROR', error: error.message });
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting MCP Jupyter Complete Tool Tests\n');
    
    await this.createTestNotebook();

    // Test 1: list_cells
    await this.testTool('list_cells', 
      { notebook_path: this.testNotebook }, 
      'List all cells in notebook');

    // Test 2: get_cell_source
    await this.testTool('get_cell_source', 
      { notebook_path: this.testNotebook, cell_index: 0 }, 
      'Get source of first cell');

    // Test 3: edit_cell_source
    await this.testTool('edit_cell_source', 
      { notebook_path: this.testNotebook, cell_index: 1, new_source: 'print("Modified by MCP!")' }, 
      'Edit source of second cell');

    // Test 4: insert_cell
    await this.testTool('insert_cell', 
      { notebook_path: this.testNotebook, position: 1, cell_type: 'code', source: 'print("Inserted cell")' }, 
      'Insert new code cell');

    // Test 5: add_cell
    await this.testTool('add_cell', 
      { notebook_path: this.testNotebook, source: 'print("Added cell")', cell_type: 'code' }, 
      'Add cell at end');

    // Test 6: move_cell
    await this.testTool('move_cell', 
      { notebook_path: this.testNotebook, from_index: 2, to_index: 1 }, 
      'Move cell from position 2 to 1');

    // Test 7: convert_cell_type
    await this.testTool('convert_cell_type', 
      { notebook_path: this.testNotebook, cell_index: 0, new_type: 'code' }, 
      'Convert markdown cell to code');

    // Test 8: read_notebook_with_outputs
    await this.testTool('read_notebook_with_outputs', 
      { notebook_path: this.testNotebook }, 
      'Read notebook with outputs');

    // Test 9: edit_cell (by ID/index)
    await this.testTool('edit_cell', 
      { notebook_path: this.testNotebook, cell_id: 0, new_source: 'print("Edited by edit_cell")' }, 
      'Edit cell using edit_cell tool');

    // Test 10: bulk_edit_cells
    await this.testTool('bulk_edit_cells', 
      { 
        notebook_path: this.testNotebook, 
        operations: [
          { type: 'edit', cell_index: 1, new_source: 'print("Bulk edit 1")' },
          { type: 'edit', cell_index: 2, new_source: 'print("Bulk edit 2")' }
        ]
      }, 
      'Bulk edit multiple cells');

    // Test 11: execute_cell (this might fail without active kernel)
    await this.testTool('execute_cell', 
      { notebook_path: this.testNotebook, cell_id: 0 }, 
      'Execute first cell');

    // Test 12: delete_cell
    await this.testTool('delete_cell', 
      { notebook_path: this.testNotebook, cell_index: 3 }, 
      'Delete a cell');

    // Test 13: trigger_vscode_reload
    await this.testTool('trigger_vscode_reload', 
      { notebook_path: this.testNotebook }, 
      'Trigger VS Code reload');

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MCP Jupyter Complete Test Summary');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🚨 Errors: ${errors}`);
    console.log(`📈 Total: ${this.testResults.length}`);

    if (failed > 0 || errors > 0) {
      console.log('\n🔍 Failed/Error Details:');
      this.testResults.forEach(result => {
        if (result.status !== 'PASSED') {
          console.log(`   ${result.tool}: ${result.status} - ${result.error || 'Unknown error'}`);
        }
      });
    }

    console.log('\n' + '='.repeat(60));
  }

  async cleanup() {
    try {
      await fs.remove(this.testNotebook);
      console.log(`🧹 Cleaned up test notebook: ${this.testNotebook}`);
    } catch (error) {
      console.log(`⚠️  Failed to cleanup: ${error.message}`);
    }
  }
}

// Run tests
const tester = new MCPToolTester();
tester.runAllTests()
  .then(() => tester.cleanup())
  .catch(console.error);
