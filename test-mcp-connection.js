#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

class MCPTester {
  constructor() {
    this.requestId = 1;
  }

  async testMCPServer() {
    console.log('🧪 Testing MCP Jupyter Complete Server...\n');

    // Test 1: Initialize connection
    console.log('1️⃣ Testing server initialization...');
    const initResult = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });
    
    if (initResult.error) {
      console.error('❌ Initialization failed:', initResult.error);
      return false;
    }
    console.log('✅ Server initialized successfully');

    // Test 2: List tools
    console.log('\n2️⃣ Testing tools/list...');
    const toolsResult = await this.sendRequest('tools/list', {});
    
    if (toolsResult.error) {
      console.error('❌ Tools list failed:', toolsResult.error);
      return false;
    }
    
    console.log(`✅ Found ${toolsResult.result.tools.length} tools:`);
    toolsResult.result.tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });

    // Test 3: Create a test notebook
    console.log('\n3️⃣ Creating test notebook...');
    const testNotebookPath = '/home/cpu/project/mcp-jupyter-complete/test-notebook.ipynb';
    const testNotebook = {
      cells: [
        {
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [],
          source: ['print("Hello from MCP test!")']
        }
      ],
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3'
        },
        language_info: {
          name: 'python',
          version: '3.10.0'
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    };

    try {
      const fs = await import('fs');
      fs.writeFileSync(testNotebookPath, JSON.stringify(testNotebook, null, 2));
      console.log('✅ Test notebook created');
    } catch (error) {
      console.error('❌ Failed to create test notebook:', error.message);
      return false;
    }

    // Test 4: List cells
    console.log('\n4️⃣ Testing list_cells...');
    const listResult = await this.sendRequest('tools/call', {
      name: 'list_cells',
      arguments: {
        notebook_path: testNotebookPath
      }
    });

    if (listResult.error) {
      console.error('❌ list_cells failed:', listResult.error);
      return false;
    }
    console.log('✅ list_cells successful:', listResult.result);

    // Test 5: Get cell source
    console.log('\n5️⃣ Testing get_cell_source...');
    const getResult = await this.sendRequest('tools/call', {
      name: 'get_cell_source',
      arguments: {
        notebook_path: testNotebookPath,
        cell_index: 0
      }
    });

    if (getResult.error) {
      console.error('❌ get_cell_source failed:', getResult.error);
      return false;
    }
    console.log('✅ get_cell_source successful:', getResult.result);

    console.log('\n🎉 All tests passed! MCP server is working correctly.');
    return true;
  }

  async sendRequest(method, params) {
    return new Promise((resolve) => {
      const request = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: method,
        params: params
      };

      const env = {
        ...process.env,
        JUPYTER_URL: 'http://localhost:8888',
        JUPYTER_TOKEN: 'ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359'
      };

      const child = spawn('node', ['src/index.js'], {
        cwd: '/home/cpu/project/mcp-jupyter-complete',
        env: env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          // Parse the JSON response
          const lines = stdout.trim().split('\n');
          const responseLine = lines.find(line => {
            try {
              const parsed = JSON.parse(line);
              return parsed.id === request.id;
            } catch {
              return false;
            }
          });

          if (responseLine) {
            const response = JSON.parse(responseLine);
            resolve(response);
          } else {
            resolve({
              error: {
                code: -1,
                message: `No valid response found. stdout: ${stdout}, stderr: ${stderr}`
              }
            });
          }
        } catch (error) {
          resolve({
            error: {
              code: -1,
              message: `Failed to parse response: ${error.message}. stdout: ${stdout}, stderr: ${stderr}`
            }
          });
        }
      });

      // Send the request
      child.stdin.write(JSON.stringify(request) + '\n');
      child.stdin.end();
    });
  }
}

// Run the test
const tester = new MCPTester();
tester.testMCPServer().catch(console.error);
