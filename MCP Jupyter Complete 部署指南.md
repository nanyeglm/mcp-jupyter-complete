# MCP Jupyter Complete 完整部署指南

## 目录

1. [概述](#概述)
2. [环境信息](#环境信息)
3. [第一部分：Conda 环境创建与配置](#第一部分conda-环境创建与配置)
4. [第二部分：MCP Jupyter Complete 安装](#第二部分mcp-jupyter-complete-安装)
5. [第三部分：Jupyter 用户服务配置](#第三部分jupyter-用户服务配置)
6. [第四部分：MCP 服务器测试](#第四部分mcp-服务器测试)
7. [第五部分：客户端配置](#第五部分客户端配置)
8. [第六部分：功能验证](#第六部分功能验证)
9. [第七部分：故障排除](#第七部分故障排除)
10. [附录](#附录)

---

## 概述

MCP Jupyter Complete 是一个基于 Model Context Protocol (MCP) 的服务器，允许 AI 助手（如 Claude）直接操作 Jupyter Notebook 文件。通过本指南，你将完成以下目标：

- 创建独立的 Conda 虚拟环境
- 部署 Jupyter Notebook 服务并配置为系统服务（开机自启）
- 安装并配置 MCP Jupyter Complete 服务器
- 配置各类客户端（Claude Desktop、VS Code 扩展等）连接到服务

---

## 环境信息

本指南以以下环境为示例，请根据实际情况替换相应路径和参数：

| 配置项 | 值 |
|--------|------|
| **操作系统** | Ubuntu |
| **用户名** | cpu |
| **Python 环境** | Miniforge3 (`/home/cpu/miniforge3`) |
| **项目目录** | `/mnt/data/mcp/mcp-jupyter-complete` |
| **JupyterLab 端口** | 8888 |
| **Jupyter Token** | `ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359` |

> **注意**：Token 可自定义，建议使用长随机字符串以确保安全性。

---

## 第一部分：Conda 环境创建与配置

本部分将创建一个专用的 Conda 虚拟环境，与系统其他环境隔离，避免依赖冲突。

### 1.1 确认 Conda 可用

```bash
conda --version
```

**预期输出**：

```text
conda 24.x.x
```

如果提示 `command not found`，需要先初始化 Conda：

```bash
source /home/cpu/miniforge3/etc/profile.d/conda.sh
conda init bash
source ~/.bashrc
```

### 1.2 查看现有环境

```bash
conda env list
```

**预期输出**（示例）：

```text
# conda environments:
#
base                  *  /home/cpu/miniforge3
```

### 1.3 创建专用虚拟环境

```bash
conda create -n mcp-jupyter-complete python=3.10 -y
```

**预期输出**（末尾）：

```text
Preparing transaction: done
Verifying transaction: done
Executing transaction: done
#
# To activate this environment, use
#
#     $ conda activate mcp-jupyter-complete
```

### 1.4 激活环境

```bash
conda activate mcp-jupyter-complete
```

**验证**：命令提示符前应出现 `(mcp-jupyter-complete)`：

```text
(mcp-jupyter-complete) cpu@ubuntu:~$
```

### 1.5 安装必要的 Python 包

#### 1.5.1 安装 Jupyter 核心组件

```bash
conda install jupyter jupyter_client jupyter_core -y
```

#### 1.5.2 安装格式转换工具

```bash
conda install pandoc nbconvert -y
```

#### 1.5.3 安装 Kernel 支持

```bash
conda install ipykernel ipywidgets -y
```

#### 1.5.4 安装数据科学常用包（可选但推荐）

```bash
conda install numpy pandas matplotlib seaborn -y
```

### 1.6 验证安装

```bash
jupyter --version
```

**预期输出**：

```text
Selected Jupyter core packages...
IPython          : 8.x.x
ipykernel        : 6.x.x
ipywidgets       : 8.x.x
jupyter_client   : 8.x.x
jupyter_core     : 5.x.x
jupyter_server   : 2.x.x
jupyterlab       : 4.x.x
nbclient         : 0.x.x
nbconvert        : 7.x.x
nbformat         : 5.x.x
notebook         : 7.x.x
qtconsole        : not installed
traitlets        : 5.x.x
```

```bash
pandoc --version
```

**预期输出**（首行）：

```text
pandoc 3.x.x
```

### 1.7 注册 Jupyter Kernel

将当前环境注册为 Jupyter Kernel，使其可在 Notebook 中选择：

```bash
python -m ipykernel install --user --name mcp-jupyter-complete --display-name "MCP Jupyter Complete"
```

**预期输出**：

```text
Installed kernelspec mcp-jupyter-complete in /home/cpu/.local/share/jupyter/kernels/mcp-jupyter-complete
```

**验证 Kernel 注册**：

```bash
jupyter kernelspec list
```

**预期输出**：

```text
Available kernels:
  mcp-jupyter-complete    /home/cpu/.local/share/jupyter/kernels/mcp-jupyter-complete
  python3                 /home/cpu/miniforge3/envs/mcp-jupyter-complete/share/jupyter/kernels/python3
```

### 1.8 环境创建完成检查清单

| 检查项 | 命令 | 预期结果 |
|--------|------|----------|
| 环境存在 | `conda env list \| grep mcp-jupyter-complete` | 显示环境路径 |
| Python 版本 | `python --version` | Python 3.10.x |
| Jupyter 可用 | `jupyter --version` | 显示版本信息 |
| Pandoc 可用 | `pandoc --version` | 显示版本信息 |
| Kernel 已注册 | `jupyter kernelspec list` | 包含 mcp-jupyter-complete |

---

## 第二部分：MCP Jupyter Complete 安装

### 2.1 创建项目目录

```bash
mkdir -p /mnt/data/mcp
cd /mnt/data/mcp
```

### 2.2 克隆项目仓库

```bash
git clone https://github.com/tofunori/mcp-jupyter-complete.git
```

**预期输出**：

```text
Cloning into 'mcp-jupyter-complete'...
remote: Enumerating objects: xxx, done.
remote: Counting objects: 100% (xxx/xxx), done.
remote: Compressing objects: 100% (xxx/xxx), done.
remote: Total xxx (delta xxx), reused xxx (delta xxx), pack-reused xxx
Receiving objects: 100% (xxx/xxx), xxx KiB | xxx KiB/s, done.
Resolving deltas: 100% (xxx/xxx), done.
```

### 2.3 进入项目目录

```bash
cd mcp-jupyter-complete
```

### 2.4 确认 Node.js 环境

```bash
node --version
```

**预期输出**：

```text
v18.x.x 或更高版本
```

如果 Node.js 未安装，请先安装：

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2.5 安装项目依赖

```bash
npm install
```

**预期输出**（末尾）：

```text
added xxx packages in xxxs
```

### 2.6 验证项目结构

```bash
ls -la
```

**预期输出**（应包含以下关键文件）：

```text
drwxr-xr-x  node_modules/
-rw-r--r--  package.json
-rw-r--r--  package-lock.json
drwxr-xr-x  src/
```

### 2.7 验证入口文件存在

```bash
ls -la src/index.js
```

**预期输出**：

```text
-rw-r--r-- 1 cpu cpu xxxx xxx xx xx:xx src/index.js
```

---

## 第三部分：Jupyter 用户服务配置

本部分将 Jupyter Notebook 配置为 systemd 用户服务，实现开机自启动和后台运行。

### 3.1 创建 systemd 用户目录

```bash
mkdir -p ~/.config/systemd/user
```

### 3.2 创建服务配置文件

```bash
nano ~/.config/systemd/user/jupyter.service
```

写入以下内容：

```ini
[Unit]
Description=Jupyter Notebook Server (MCP Jupyter Complete Environment)
After=network.target

[Service]
Type=simple
ExecStart=/home/cpu/miniforge3/bin/conda run -n mcp-jupyter-complete jupyter notebook --no-browser --ip=127.0.0.1 --port=8888 --NotebookApp.token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359
WorkingDirectory=/home/cpu
Restart=always
RestartSec=10
Environment="JUPYTER_CONFIG_DIR=/home/cpu/.jupyter"
Environment="JUPYTER_RUNTIME_DIR=/home/cpu/.local/share/jupyter/runtime"
Environment="CONDA_DEFAULT_ENV=mcp-jupyter-complete"

[Install]
WantedBy=default.target
```

保存并退出（Ctrl+O, Enter, Ctrl+X）。

### 3.3 配置参数说明

| 参数 | 说明 |
|------|------|
| `ExecStart` | 使用 `conda run -n mcp-jupyter-complete` 在指定环境中启动 Jupyter |
| `--no-browser` | 不自动打开浏览器 |
| `--ip=127.0.0.1` | 仅监听本地地址（安全考虑） |
| `--port=8888` | 监听端口 |
| `--NotebookApp.token=xxx` | 访问令牌 |
| `Restart=always` | 进程异常退出时自动重启 |
| `RestartSec=10` | 重启前等待 10 秒 |

### 3.4 重新加载 systemd 配置

```bash
systemctl --user daemon-reload
```

### 3.5 启用服务（开机自启）

```bash
systemctl --user enable jupyter
```

**预期输出**：

```text
Created symlink /home/cpu/.config/systemd/user/default.target.wants/jupyter.service → /home/cpu/.config/systemd/user/jupyter.service.
```

### 3.6 启动服务

```bash
systemctl --user start jupyter
```

### 3.7 检查服务状态

```bash
systemctl --user status jupyter
```

**预期输出**（服务正常运行）：

```text
● jupyter.service - Jupyter Notebook Server (MCP Jupyter Complete Environment)
     Loaded: loaded (/home/cpu/.config/systemd/user/jupyter.service; enabled; vendor preset: enabled)
     Active: active (running) since xxx
   Main PID: xxxxx (conda)
      Tasks: xx (limit: xxxxx)
     Memory: xxxM
        CPU: xxxms
     CGroup: /user.slice/user-1000.slice/user@1000.service/app.slice/jupyter.service
             ├─xxxxx /home/cpu/miniforge3/envs/mcp-jupyter-complete/bin/python ...
             ...
```

**关键检查点**：

- `Active: active (running)` 表示服务正在运行
- 如果显示 `failed`，请查看日志排查问题

### 3.8 查看服务日志

```bash
journalctl --user -u jupyter -f
```

按 `Ctrl+C` 退出日志查看。

**正常日志示例**：

```text
[I xxxx-xx-xx xx:xx:xx.xxx ServerApp] Jupyter Server x.x.x is running at:
[I xxxx-xx-xx xx:xx:xx.xxx ServerApp] http://127.0.0.1:8888/tree?token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359
```

### 3.9 验证端口监听

```bash
ss -tlnp | grep 8888
```

**预期输出**：

```text
LISTEN 0      128        127.0.0.1:8888       0.0.0.0:*
```

### 3.10 测试 Jupyter API

```bash
curl -s "http://localhost:8888/api/sessions?token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"
```

**预期输出**：

```text
[]
```

空数组 `[]` 表示 API 正常响应，当前没有活动会话。

### 3.11 常用服务管理命令

| 操作 | 命令 |
|------|------|
| 启动服务 | `systemctl --user start jupyter` |
| 停止服务 | `systemctl --user stop jupyter` |
| 重启服务 | `systemctl --user restart jupyter` |
| 查看状态 | `systemctl --user status jupyter` |
| 查看日志 | `journalctl --user -u jupyter -f` |
| 禁用自启 | `systemctl --user disable jupyter` |

---

## 第四部分：MCP 服务器测试

### 4.1 创建启动脚本

为便于管理，创建一个启动脚本：

```bash
nano /mnt/data/mcp/mcp-jupyter-complete/start-mcp.sh
```

写入以下内容：

```bash
#!/bin/bash
cd /mnt/data/mcp/mcp-jupyter-complete
export JUPYTER_URL=http://localhost:8888
export JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359
node src/index.js
```

保存并退出。

### 4.2 设置执行权限

```bash
chmod +x /mnt/data/mcp/mcp-jupyter-complete/start-mcp.sh
```

### 4.3 验证执行权限

```bash
ls -la /mnt/data/mcp/mcp-jupyter-complete/start-mcp.sh
```

**预期输出**（注意 `x` 权限）：

```text
-rwxr-xr-x 1 cpu cpu xxx xxx xx xx:xx /mnt/data/mcp/mcp-jupyter-complete/start-mcp.sh
```

### 4.4 手动测试 MCP 服务器

```bash
cd /mnt/data/mcp/mcp-jupyter-complete
JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 node src/index.js
```

**预期输出**：

```text
[Jupyter Handler] Services initialized
MCP Jupyter Complete server running on stdio
```

服务器启动后会等待 stdin 输入，按 `Ctrl+C` 退出。

### 4.5 MCP 服务器环境变量说明

| 环境变量 | 说明 | 示例值 |
|----------|------|--------|
| `JUPYTER_URL` | Jupyter 服务地址 | `http://localhost:8888` |
| `JUPYTER_TOKEN` | Jupyter 访问令牌 | `ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359` |

---

## 第五部分：客户端配置

MCP 服务器支持多种客户端连接方式。以下提供几种常见配置方案。

### 5.1 Claude Desktop 配置

#### 方案一：SSH 远程调用（推荐）

适用于客户端（Windows/Mac）与服务器（Ubuntu）在不同机器的场景。

**前提条件**：配置 SSH 免密登录

```bash
# 在客户端机器上执行
ssh-keygen -t rsa -b 4096
ssh-copy-id cpu@<服务器IP>

# 验证免密登录
ssh cpu@<服务器IP> "echo 'SSH connection successful'"
```

**配置文件路径**：

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

**配置内容**：

```json
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@<服务器IP>",
        "cd /mnt/data/mcp/mcp-jupyter-complete && JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 node src/index.js"
      ]
    }
  }
}
```

#### 方案二：使用启动脚本

使用前面创建的启动脚本，配置更简洁：

```json
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@<服务器IP>",
        "/mnt/data/mcp/mcp-jupyter-complete/start-mcp.sh"
      ]
    }
  }
}
```

#### 方案三：本地调用

适用于客户端与服务器在同一台机器的场景：

```json
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
```

### 5.2 VS Code + Continue.dev 配置

Continue.dev 是一个支持 MCP 协议的 VS Code 扩展。

**配置文件路径**：`~/.continue/config.json`

```json
{
  "models": [
    {
      "title": "Claude with Jupyter",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "<your-api-key>"
    }
  ],
  "mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@<服务器IP>",
        "cd /mnt/data/mcp/mcp-jupyter-complete && JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 node src/index.js"
      ]
    }
  }
}
```

### 5.3 VS Code + Cline 配置

Cline 是另一个支持 MCP 的 VS Code 扩展。

**配置文件路径**：`.vscode/settings.json` 或 VS Code 用户设置

```json
{
  "cline.mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@<服务器IP>",
        "cd /mnt/data/mcp/mcp-jupyter-complete && JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 node src/index.js"
      ]
    }
  }
}
```

### 5.4 Windsurf 配置

**配置文件路径**：`~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@<服务器IP>",
        "/mnt/data/mcp/mcp-jupyter-complete/start-mcp.sh"
      ]
    }
  }
}
```

### 5.5 通用配置模板

对于其他支持 MCP 协议的客户端，可参考以下通用模板：

```json
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "<用户名>@<服务器IP>",
        "cd /mnt/data/mcp/mcp-jupyter-complete && JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=<你的Token> node src/index.js"
      ]
    }
  }
}
```

### 5.6 客户端配置后的验证步骤

1. **重启客户端应用**：配置修改后需重启应用程序
2. **检查 MCP 连接状态**：在客户端界面中确认 `jupyter-complete` 服务已连接
3. **测试工具调用**：尝试调用一个简单的 MCP 工具验证连接

---

## 第六部分：功能验证

### 6.1 创建测试 Notebook

```bash
mkdir -p /home/cpu/notebooks
cat > /home/cpu/notebooks/test.ipynb << 'EOF'
{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": ["print('Hello from MCP Jupyter Complete!')"]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": ["# Test Notebook\n\nThis is a test notebook for MCP Jupyter Complete."]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "MCP Jupyter Complete",
   "language": "python",
   "name": "mcp-jupyter-complete"
  },
  "language_info": {
   "name": "python",
   "version": "3.10.0"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 4
}
EOF
```

### 6.2 MCP 工具功能列表

| 工具名称 | 功能说明 |
|----------|----------|
| `list_cells` | 列出 Notebook 中所有 Cell |
| `get_cell_source` | 获取指定 Cell 的源代码 |
| `edit_cell_source` | 编辑指定 Cell 的内容 |
| `insert_cell` | 在指定位置插入新 Cell |
| `delete_cell` | 删除指定 Cell |
| `move_cell` | 移动 Cell 位置 |
| `convert_cell_type` | 转换 Cell 类型（code/markdown） |
| `execute_cell` | 执行指定 Cell |
| `read_notebook_with_outputs` | 读取 Notebook 及输出结果 |

### 6.3 工具调用示例

在客户端中可以通过以下方式调用 MCP 工具：

**列出所有 Cells**：

```javascript
list_cells({ notebook_path: "/home/cpu/notebooks/test.ipynb" })
```

**获取 Cell 内容**：

```javascript
get_cell_source({ 
  notebook_path: "/home/cpu/notebooks/test.ipynb", 
  cell_index: 0 
})
```

**编辑 Cell**：

```javascript
edit_cell_source({ 
  notebook_path: "/home/cpu/notebooks/test.ipynb", 
  cell_index: 0, 
  new_source: "print('Modified by MCP!')" 
})
```

**插入新 Cell**：

```javascript
insert_cell({
  notebook_path: "/home/cpu/notebooks/test.ipynb",
  position: 1,
  cell_type: "code",
  source: "import pandas as pd\nprint(pd.__version__)"
})
```

**执行 Cell**：

```javascript
execute_cell({
  notebook_path: "/home/cpu/notebooks/test.ipynb",
  cell_index: 0
})
```

---

## 第七部分：故障排除

### 7.1 Conda 环境问题

#### 问题：环境不存在或无法激活

```bash
# 检查环境列表
conda env list

# 如果环境不存在，重新创建
conda create -n mcp-jupyter-complete python=3.10 -y

# 重新安装依赖
conda activate mcp-jupyter-complete
conda install jupyter jupyter_client jupyter_core pandoc nbconvert ipykernel -y
```

#### 问题：Kernel 未注册

```bash
# 检查已注册的 Kernel
jupyter kernelspec list

# 重新注册 Kernel
conda activate mcp-jupyter-complete
python -m ipykernel install --user --name mcp-jupyter-complete --display-name "MCP Jupyter Complete"
```

### 7.2 Jupyter 服务问题

#### 问题：服务启动失败

```bash
# 查看详细错误日志
journalctl --user -u jupyter -n 50

# 手动测试启动命令
/home/cpu/miniforge3/bin/conda run -n mcp-jupyter-complete jupyter notebook --no-browser --ip=127.0.0.1 --port=8888 --NotebookApp.token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359
```

#### 问题：端口被占用

```bash
# 检查端口占用情况
ss -tlnp | grep 8888

# 或使用 lsof
sudo lsof -i :8888

# 如果有其他进程占用，终止它或更换端口
```

#### 问题：API 返回 403 Forbidden

Token 不正确，检查配置文件中的 Token 是否与 Jupyter 服务启动参数一致。

### 7.3 MCP 服务器问题

#### 问题：提示 `Services initialized` 失败

```bash
# 确认 Jupyter 服务正在运行
systemctl --user status jupyter

# 确认环境变量正确
echo "JUPYTER_URL: $JUPYTER_URL"
echo "JUPYTER_TOKEN: $JUPYTER_TOKEN"

# 测试 Jupyter API
curl -s "http://localhost:8888/api/sessions?token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"
```

#### 问题：Node.js 模块缺失

```bash
cd /mnt/data/mcp/mcp-jupyter-complete
rm -rf node_modules package-lock.json
npm install
```

### 7.4 SSH 连接问题

#### 问题：SSH 连接超时

```bash
# 测试 SSH 连接
ssh -v cpu@<服务器IP>

# 检查 SSH 服务状态
sudo systemctl status sshd
```

#### 问题：SSH 需要密码

```bash
# 在客户端生成密钥（如果没有）
ssh-keygen -t rsa -b 4096

# 复制公钥到服务器
ssh-copy-id cpu@<服务器IP>
```

### 7.5 客户端配置问题

#### 问题：MCP 服务未显示

1. 检查配置文件路径是否正确
2. 检查 JSON 格式是否有语法错误
3. 重启客户端应用程序
4. 查看客户端日志获取详细错误信息

#### 问题：JSON 格式验证

```bash
# 使用 jq 验证 JSON 格式
cat ~/.claude.json | jq .
```

如果有语法错误，jq 会提示错误位置。

---

## 附录

### A. 完整部署检查清单

| 序号 | 检查项 | 验证命令 | 预期结果 |
|------|--------|----------|----------|
| 1 | Conda 环境已创建 | `conda env list \| grep mcp-jupyter-complete` | 显示环境路径 |
| 2 | Python 版本正确 | `conda run -n mcp-jupyter-complete python --version` | Python 3.10.x |
| 3 | Jupyter 已安装 | `conda run -n mcp-jupyter-complete jupyter --version` | 显示版本信息 |
| 4 | Kernel 已注册 | `jupyter kernelspec list` | 包含 mcp-jupyter-complete |
| 5 | MCP 项目已克隆 | `ls /mnt/data/mcp/mcp-jupyter-complete/src/index.js` | 文件存在 |
| 6 | npm 依赖已安装 | `ls /mnt/data/mcp/mcp-jupyter-complete/node_modules` | 目录存在且非空 |
| 7 | Jupyter 服务运行中 | `systemctl --user status jupyter` | active (running) |
| 8 | 端口正在监听 | `ss -tlnp \| grep 8888` | 显示监听状态 |
| 9 | API 响应正常 | `curl -s "http://localhost:8888/api/sessions?token=..."` | 返回 `[]` |
| 10 | MCP 服务器可启动 | 手动运行 node src/index.js | 显示初始化成功 |

### B. 服务端口说明

| 服务 | 默认端口 | 用途 |
|------|----------|------|
| Jupyter Notebook | 8888 | Notebook Web 界面和 API |
| MCP Server | stdio | 通过标准输入输出通信（无端口） |

### C. 重要文件路径

| 文件/目录 | 路径 |
|-----------|------|
| Conda 环境 | `/home/cpu/miniforge3/envs/mcp-jupyter-complete` |
| MCP 项目 | `/mnt/data/mcp/mcp-jupyter-complete` |
| 启动脚本 | `/mnt/data/mcp/mcp-jupyter-complete/start-mcp.sh` |
| systemd 服务 | `~/.config/systemd/user/jupyter.service` |
| Jupyter 配置 | `~/.jupyter/jupyter_notebook_config.py` |
| Kernel 配置 | `~/.local/share/jupyter/kernels/mcp-jupyter-complete` |

### D. 环境备份与恢复

**导出环境配置**：

```bash
conda activate mcp-jupyter-complete
conda env export > mcp-jupyter-complete.yml
```

**从配置恢复环境**：

```bash
conda env create -f mcp-jupyter-complete.yml
```

---

## 总结

完成本指南的所有步骤后，你将拥有：

1. **独立的 Conda 环境**：`mcp-jupyter-complete`，包含所有必要依赖
2. **自启动的 Jupyter 服务**：通过 systemd 用户服务管理，开机自动运行
3. **可用的 MCP 服务器**：支持通过多种客户端连接和操作 Notebook
4. **灵活的客户端配置**：支持 Claude Desktop、VS Code 扩展等多种客户端

如有问题，请参考第七部分故障排除章节。
