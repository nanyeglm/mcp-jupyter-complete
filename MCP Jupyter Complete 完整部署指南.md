# MCP Jupyter Complete 完整部署指南

## 概述

本指南详细说明如何在 Ubuntu 服务器上部署 MCP Jupyter Complete 服务，并通过多种客户端进行调用。

## 环境说明

- **开发环境**: Ubuntu 服务器（局域网内）
- **客户端**: Windows 电脑
- **IDE**: VS Code（通过 Remote SSH 连接 Ubuntu）
- **Python 环境**: Miniforge3 (`/home/cpu/miniforge3`)
- **需求**: 自动化 Jupyter 服务，无需手动启动

## 第一部分：服务端部署

### 1. 环境准备

确认 conda 环境：

```bash
conda env list
# 应该看到：
# base                  *  /home/cpu/miniforge3
# gym                      /home/cpu/miniforge3/envs/gym
# phalp                    /home/cpu/miniforge3/envs/phalp
```

### 2. 克隆和安装 MCP Jupyter Complete

```bash
# 克隆项目
cd /mnt/data/mcp
git clone https://github.com/tofunori/mcp-jupyter-complete.git
cd mcp-jupyter-complete

# 安装依赖
npm install

# 全局安装（可选）
npm link
```

### 3. 配置 Jupyter 系统服务

创建用户级别的 systemd 服务，确保 Jupyter 始终运行：

```bash
nano ~/.config/systemd/user/jupyter.service
```

服务配置内容：

````ini path=~/.config/systemd/user/jupyter.service mode=EDIT
[Unit]
Description=Jupyter Notebook Server
After=network.target

[Service]
Type=simple
ExecStart=/home/cpu/miniforge3/bin/conda run -n base jupyter notebook --no-browser --ip=127.0.0.1 --port=8888 --NotebookApp.token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359
WorkingDirectory=/home/cpu
Restart=always
Environment="JUPYTER_CONFIG_DIR=/home/cpu/.jupyter"
Environment="JUPYTER_RUNTIME_DIR=/home/cpu/.local/share/jupyter/runtime"

[Install]
WantedBy=default.target
````

### 4. 启用和启动服务

```bash
# 重新加载 systemd 配置
systemctl --user daemon-reload

# 启用服务（开机自启）
systemctl --user enable jupyter

# 启动服务
systemctl --user start jupyter

# 检查服务状态
systemctl --user status jupyter
```

### 5. 验证 Jupyter 服务

```bash
# 测试 API 连接
curl -v "http://localhost:8888/api/sessions?token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"
```

应该返回 `200 OK` 和空的会话列表 `[]`。

### 6. 修改 MCP 服务器支持环境变量

编辑 `src/jupyter-handler.js`，确保支持环境变量配置：

````javascript path=src/jupyter-handler.js mode=EDIT
async initializeServices() {
  try {
    // Get configuration from environment variables
    const baseUrl = process.env.JUPYTER_URL || 'http://localhost:8888/';
    const token = process.env.JUPYTER_PASSWORD || process.env.JUPYTER_TOKEN || '';
    
    // Ensure baseUrl ends with /
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    const wsUrl = normalizedBaseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    
    // Set up page config for Jupyter services with token
    PageConfig.setOption('baseUrl', normalizedBaseUrl);
    PageConfig.setOption('wsUrl', wsUrl);
    if (token) {
      PageConfig.setOption('token', token);
    }
    
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
````

### 7. 测试 MCP 服务器

```bash
# 使用环境变量测试
JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 mcp-jupyter-complete
```

成功输出应该显示：

```
[Jupyter Handler] Services initialized
MCP Jupyter Complete server running on stdio
```

## 第二部分：客户端配置

### 通用配置参数说明

所有 MCP 客户端都需要以下核心配置参数：

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `command` | 启动 MCP 服务器的命令 | `"node"`, `"ssh"`, `"mcp-jupyter-complete"` |
| `args` | 命令行参数数组 | `["/path/to/index.js"]`, `["user@host", "command"]` |
| `env` | 环境变量对象 | `{"JUPYTER_URL": "http://localhost:8888"}` |
| `cwd` | 工作目录（可选） | `"/path/to/project"` |

### 1. Claude Desktop 配置

#### 方案一：SSH 远程调用（推荐）

````json path=~/.claude.json mode=EDIT
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@{ubuntu-server-ip}",
        "cd /mnt/data/mcp/mcp-jupyter-complete && JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 node src/index.js"
      ]
    }
  }
}
````

#### 方案二：使用启动脚本

创建启动脚本：

````bash path=/mnt/data/mcp/mcp-jupyter-complete/start-mcp.sh mode=EDIT
#!/bin/bash
cd /mnt/data/mcp/mcp-jupyter-complete
export JUPYTER_URL=http://localhost:8888
export JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359
node src/index.js
````

```bash
chmod +x /mnt/data/mcp/mcp-jupyter-complete/start-mcp.sh
```

配置文件：

````json path=~/.claude.json mode=EDIT
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@{ubuntu-server-ip}",
        "/mnt/data/mcp/mcp-jupyter-complete/start-mcp.sh"
      ]
    }
  }
}
````

#### 方案三：本地安装（如果在同一台机器）

````json path=~/.claude.json mode=EDIT
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "node",
      "args": ["/mnt/data/mcp/mcp-jupyter-complete/src/index.js"],
      "env": {
        "JUPYTER_URL": "http://localhost:8888",
        "JUPYTER_TOKEN": "ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"
      }
    }
  }
}
````

### 2. Continue.dev 配置

Continue.dev 是一个 VS Code 扩展，支持 MCP 协议。

````json path=~/.continue/config.json mode=EDIT
{
  "models": [
    {
      "title": "Claude with Jupyter",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "your-api-key"
    }
  ],
  "mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@{ubuntu-server-ip}",
        "cd /mnt/data/mcp/mcp-jupyter-complete && JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 node src/index.js"
      ]
    }
  }
}
````

### 3. Cline (VS Code 扩展) 配置

Cline 是另一个支持 MCP 的 VS Code 扩展。

````json path=.vscode/settings.json mode=EDIT
{
  "cline.mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@{ubuntu-server-ip}",
        "cd /mnt/data/mcp/mcp-jupyter-complete && JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 node src/index.js"
      ]
    }
  }
}
````

### 4. 自定义 Python 客户端

创建一个 Python 客户端来调用 MCP 服务器：

````python path=mcp_client.py mode=EDIT
import subprocess
import json
import sys

class MCPJupyterClient:
    def __init__(self, server_host="cpu@{ubuntu-server-ip}"):
        self.server_host = server_host
        self.mcp_command = [
            "ssh", server_host,
            "cd /mnt/data/mcp/mcp-jupyter-complete && "
            "JUPYTER_URL=http://localhost:8888 "
            "JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 "
            "node src/index.js"
        ]
    
    def call_tool(self, tool_name, parameters):
        """调用 MCP 工具"""
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": parameters
            }
        }
        
        process = subprocess.Popen(
            self.mcp_command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(json.dumps(request))
        
        if process.returncode != 0:
            raise Exception(f"MCP call failed: {stderr}")
        
        return json.loads(stdout)
    
    def list_cells(self, notebook_path):
        """列出 notebook 中的所有 cells"""
        return self.call_tool("list_cells", {"notebook_path": notebook_path})
    
    def edit_cell(self, notebook_path, cell_index, new_source):
        """编辑指定的 cell"""
        return self.call_tool("edit_cell_source", {
            "notebook_path": notebook_path,
            "cell_index": cell_index,
            "new_source": new_source
        })

# 使用示例
if __name__ == "__main__":
    client = MCPJupyterClient()
    
    # 列出 cells
    result = client.list_cells("/path/to/notebook.ipynb")
    print(result)
    
    # 编辑 cell
    result = client.edit_cell("/path/to/notebook.ipynb", 0, "print('Hello from Python client!')")
    print(result)
````

### 5. Node.js 客户端

````javascript path=mcp_client.js mode=EDIT
import { spawn } from 'child_process';

class MCPJupyterClient {
  constructor(serverHost = 'cpu@{ubuntu-server-ip}') {
    this.serverHost = serverHost;
    this.mcpCommand = [
      'ssh', serverHost,
      'cd /mnt/data/mcp/mcp-jupyter-complete && ' +
      'JUPYTER_URL=http://localhost:8888 ' +
      'JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 ' +
      'node src/index.js'
    ];
  }

  async callTool(toolName, parameters) {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: parameters
      }
    };

    return new Promise((resolve, reject) => {
      const process = spawn('ssh', [
        this.serverHost,
        'cd /mnt/data/mcp/mcp-jupyter-complete && ' +
        'JUPYTER_URL=http://localhost:8888 ' +
        'JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 ' +
        'node src/index.js'
      ]);

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
          reject(new Error(`MCP call failed: ${stderr}`));
        } else {
          try {
            resolve(JSON.parse(stdout));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        }
      });

      process.stdin.write(JSON.stringify(request));
      process.stdin.end();
    });
  }

  async listCells(notebookPath) {
    return this.callTool('list_cells', { notebook_path: notebookPath });
  }

  async editCell(notebookPath, cellIndex, newSource) {
    return this.callTool('edit_cell_source', {
      notebook_path: notebookPath,
      cell_index: cellIndex,
      new_source: newSource
    });
  }
}

// 使用示例
const client = new MCPJupyterClient();

// 列出 cells
client.listCells('/path/to/notebook.ipynb')
  .then(result => console.log(result))
  .catch(err => console.error(err));
````

### 6. 通用配置模板

对于其他支持 MCP 的客户端，可以使用以下通用模板：

````json path=mcp-config-template.json mode=EDIT
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@{ubuntu-server-ip}",
        "cd /mnt/data/mcp/mcp-jupyter-complete && JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 node src/index.js"
      ],
      "env": {
        "NODE_ENV": "production"
      },
      "cwd": "/mnt/data/mcp/mcp-jupyter-complete"
    }
  }
}
````

## 第三部分：使用验证

### 1. 重启客户端应用

配置完成后，重启相应的客户端应用程序。

### 2. 验证 MCP 连接

在客户端中，你应该能看到 MCP 工具可用。可以尝试以下命令：

```
请列出我的 notebook 中的所有 cells
```

或者直接调用 MCP 工具：

```
使用 list_cells 工具查看 /path/to/your/notebook.ipynb
```

### 3. 常用 MCP 操作示例

```javascript
// 列出所有 cells
list_cells({ notebook_path: "/path/to/notebook.ipynb" })

// 获取特定 cell 内容
get_cell_source({ notebook_path: "/path/to/notebook.ipynb", cell_index: 0 })

// 编辑 cell
edit_cell_source({ 
  notebook_path: "/path/to/notebook.ipynb", 
  cell_index: 1, 
  new_source: "print('Hello from MCP!')" 
})

// 插入新 cell
insert_cell({
  notebook_path: "/path/to/notebook.ipynb",
  position: 2,
  cell_type: "code",
  source: "import pandas as pd"
})
```

## 故障排除

### 1. SSH 连接问题

```bash
# 测试 SSH 连接
ssh cpu@{ubuntu-server-ip} "echo 'SSH connection successful'"

# 配置免密登录
ssh-keygen -t rsa -b 4096
ssh-copy-id cpu@{ubuntu-server-ip}
```

### 2. 环境变量问题

确保所有客户端配置中都包含正确的环境变量：

```bash
JUPYTER_URL=http://localhost:8888
JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359
```

### 3. 端口和网络问题

```bash
# 检查端口监听
netstat -tlnp | grep 8888

# 测试本地连接
curl http://localhost:8888
```

### 4. 客户端特定问题

- **Claude Desktop**: 检查 `~/.claude.json` 格式
- **Continue.dev**: 检查 `~/.continue/config.json` 格式
- **VS Code 扩展**: 检查工作区设置
- **自定义客户端**: 检查 JSON-RPC 协议实现

## 安全注意事项

1. **SSH 安全**: 使用密钥认证，禁用密码登录
2. **Token 安全**: 定期更换 Jupyter token
3. **网络安全**: 考虑使用 VPN 或防火墙限制访问
4. **权限控制**: 使用用户级别的 systemd 服务

## 总结

通过以上配置，你的 MCP Jupyter Complete 服务将支持：

1. ✅ Claude Desktop 客户端
2. ✅ Continue.dev VS Code 扩展
3. ✅ Cline VS Code 扩展
4. ✅ 自定义 Python/Node.js 客户端
5. ✅ 任何支持 MCP 协议的客户端

所有客户端都能通过统一的 MCP 协议访问远程 Ubuntu 服务器上的 Jupyter notebooks，实现无缝的跨平台开发体验！
