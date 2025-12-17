# Jupyter MCP 双服务完整部署指南

> 本指南实现在一台全新 Ubuntu 机器上，**从零开始**同时部署 `jupyter-mcp-server` 和 `mcp-jupyter-complete` 两个 MCP 服务。
> 所有命令可直接复制执行，每个步骤包含验证命令和预期结果。

---

## 环境信息

| 项目 | 配置 |
|-----|------|
| **系统** | Ubuntu |
| **Python 环境** | Miniforge3 (`/home/cpu/miniforge3`) |
| **Node.js** | 需要安装（用于 mcp-jupyter-complete） |
| **mcp-jupyter-complete 端口** | 8888 (Jupyter Notebook) |
| **jupyter-mcp-server 端口** | 8889 (JupyterLab + RTC) |
| **Token** | `ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359` |

---

## 两个 MCP 的功能对比

| 功能 | mcp-jupyter-complete | jupyter-mcp-server |
|-----|---------------------|-------------------|
| **实现语言** | Node.js | Python |
| **Jupyter 类型** | Notebook | JupyterLab |
| **实时协作 (RTC)** | ❌ | ✅ |
| **多 Notebook 管理** | ❌ | ✅ |
| **代码执行** | ⚠️ 可选 | ✅ 完整支持 |
| **图片输出** | ❌ | ✅ |
| **适用场景** | 快速文件编辑 | 完整数据科学工作流 |

---

## 第一部分：基础环境准备

### 1.1 安装 Node.js（如未安装）

```bash
# 检查 Node.js 是否已安装
node --version

# 如果未安装，使用 NodeSource 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

**预期结果**：

```text
v18.x.x
9.x.x 或更高
```

### 1.2 安装 uv（用于 jupyter-mcp-server）

```bash
# 安装 uv
pip install uv

# 验证安装
uv --version
```

**预期结果**：

```text
uv 0.6.x 或更高
```

### 1.3 确认 Conda 环境

```bash
# 检查 conda 是否可用
conda --version

# 查看现有环境
conda env list
```

**预期结果**：

```text
conda 24.x.x
# conda environments:
base                  *  /home/cpu/miniforge3
```

---

## 第二部分：部署 mcp-jupyter-complete

### 2.1 创建 conda 环境

```bash
# 创建专用环境
conda create -n mcp-jupyter-complete python=3.10 -y

# 验证
conda env list | grep mcp-jupyter-complete
```

**预期结果**：

```text
mcp-jupyter-complete     /home/cpu/miniforge3/envs/mcp-jupyter-complete
```

### 2.2 安装 Jupyter 和依赖

```bash
# 安装 Jupyter 相关包
conda run -n mcp-jupyter-complete conda install jupyter jupyter_client jupyter_core ipykernel -y

# 安装 pandoc 和 nbconvert（可选，用于格式转换）
conda run -n mcp-jupyter-complete conda install pandoc nbconvert -y

# 注册 Jupyter kernel
conda run -n mcp-jupyter-complete python -m ipykernel install --user --name mcp-jupyter-complete --display-name "MCP Jupyter Complete"

# 验证安装
conda run -n mcp-jupyter-complete jupyter --version
```

**预期结果**：

```text
Selected Jupyter core packages...
jupyter             : 1.x.x
jupyter-client      : 8.x.x
jupyter-core        : 5.x.x
...
```

### 2.3 克隆并安装 mcp-jupyter-complete

```bash
# 创建 MCP 目录
mkdir -p /mnt/data/mcp
cd /mnt/data/mcp

# 克隆项目
git clone https://github.com/tofunori/mcp-jupyter-complete.git
cd mcp-jupyter-complete

# 安装 npm 依赖
npm install

# 验证安装
ls -la node_modules | head -5
```

**预期结果**：

```text
total xxx
drwxr-xr-x xxx xxx xxx .
drwxr-xr-x xxx xxx xxx ..
drwxr-xr-x xxx xxx xxx @jupyterlab
...
```

### 2.4 配置 Jupyter Notebook 服务

```bash
# 创建 systemd 用户目录
mkdir -p ~/.config/systemd/user

# 创建服务文件
cat > ~/.config/systemd/user/jupyter.service << 'EOF'
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
EOF

# 验证文件创建
cat ~/.config/systemd/user/jupyter.service | head -5
```

**预期结果**：

```text
[Unit]
Description=Jupyter Notebook Server (MCP Jupyter Complete Environment)
After=network.target

[Service]
```

### 2.5 启动 Jupyter Notebook 服务

```bash
# 重新加载 systemd
systemctl --user daemon-reload

# 启用并启动服务
systemctl --user enable jupyter
systemctl --user start jupyter

# 等待服务启动
sleep 3

# 检查服务状态
systemctl --user status jupyter | head -10
```

**预期结果**：

```text
● jupyter.service - Jupyter Notebook Server (MCP Jupyter Complete Environment)
     Loaded: loaded (/home/cpu/.config/systemd/user/jupyter.service; enabled; ...)
     Active: active (running) since ...
```

### 2.6 验证 Jupyter Notebook 服务

```bash
# 测试 API
curl -s -w "\nHTTP_CODE: %{http_code}\n" "http://localhost:8888/api?token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"

# 检查端口
netstat -tlnp 2>/dev/null | grep 8888 || ss -tlnp | grep 8888
```

**预期结果**：

```text
{"version": "..."}
HTTP_CODE: 200

tcp   LISTEN  0  128  127.0.0.1:8888  0.0.0.0:*
```

---

## 第三部分：部署 jupyter-mcp-server

### 3.1 创建 conda 环境

```bash
# 创建专用环境
conda create -n jupyter-mcp-server python=3.10 -y

# 验证
conda env list | grep jupyter-mcp-server
```

**预期结果**：

```text
jupyter-mcp-server       /home/cpu/miniforge3/envs/jupyter-mcp-server
```

### 3.2 安装 JupyterLab + RTC 组件

```bash
# 安装核心组件（版本严格要求）
conda run -n jupyter-mcp-server pip install jupyterlab==4.4.1 jupyter-collaboration==4.0.2 jupyter-mcp-tools>=0.1.4

# 处理 pycrdt 依赖（关键步骤）
conda run -n jupyter-mcp-server pip uninstall -y pycrdt datalayer_pycrdt
conda run -n jupyter-mcp-server pip install datalayer_pycrdt==0.12.17

# 安装 jupyter-mcp-server
conda run -n jupyter-mcp-server pip install jupyter-mcp-server

# 再次处理 pycrdt（因为上一步会覆盖）
conda run -n jupyter-mcp-server pip uninstall -y pycrdt
conda run -n jupyter-mcp-server pip install datalayer_pycrdt==0.12.17

# 安装 ipykernel 和 uv
conda run -n jupyter-mcp-server pip install ipykernel uv

# 验证安装
conda run -n jupyter-mcp-server pip list | grep -E "jupyterlab|jupyter-collaboration|datalayer_pycrdt"
```

**预期结果**：

```text
datalayer_pycrdt          0.12.17
jupyter-collaboration     4.0.2
jupyterlab                4.4.1
```

### 3.3 验证 JupyterLab 版本

```bash
conda run -n jupyter-mcp-server jupyter lab --version
```

**预期结果**：

```text
4.4.1
```

### 3.4 验证 uvx 能运行 MCP server

```bash
timeout 10 uvx jupyter-mcp-server@latest --help | head -10
```

**预期结果**：

```text
Usage: jupyter-mcp-server [OPTIONS] COMMAND [ARGS]...

  Manages Jupyter MCP Server.
...
```

### 3.5 配置 JupyterLab 服务

```bash
# 创建服务文件
cat > ~/.config/systemd/user/jupyterlab.service << 'EOF'
[Unit]
Description=JupyterLab Server (Jupyter MCP Server Environment with RTC)
After=network.target

[Service]
Type=simple
ExecStart=/home/cpu/miniforge3/bin/conda run -n jupyter-mcp-server jupyter lab --no-browser --ip=127.0.0.1 --port=8889 --IdentityProvider.token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359
WorkingDirectory=/home/cpu
Restart=always
RestartSec=10
Environment="JUPYTER_CONFIG_DIR=/home/cpu/.jupyter"
Environment="JUPYTER_RUNTIME_DIR=/home/cpu/.local/share/jupyter/runtime"
Environment="CONDA_DEFAULT_ENV=jupyter-mcp-server"

[Install]
WantedBy=default.target
EOF

# 验证文件创建
cat ~/.config/systemd/user/jupyterlab.service | head -5
```

**预期结果**：

```text
[Unit]
Description=JupyterLab Server (Jupyter MCP Server Environment with RTC)
After=network.target

[Service]
```

### 3.6 启动 JupyterLab 服务

```bash
# 重新加载 systemd
systemctl --user daemon-reload

# 启用并启动服务
systemctl --user enable jupyterlab
systemctl --user start jupyterlab

# 等待服务启动
sleep 3

# 检查服务状态
systemctl --user status jupyterlab | head -10
```

**预期结果**：

```text
● jupyterlab.service - JupyterLab Server (Jupyter MCP Server Environment with RTC)
     Loaded: loaded (/home/cpu/.config/systemd/user/jupyterlab.service; enabled; ...)
     Active: active (running) since ...
```

### 3.7 验证 JupyterLab 服务

```bash
# 测试 API
curl -s -w "\nHTTP_CODE: %{http_code}\n" "http://localhost:8889/api?token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"

# 检查端口
netstat -tlnp 2>/dev/null | grep 8889 || ss -tlnp | grep 8889
```

**预期结果**：

```text
{"version": "2.17.0"}
HTTP_CODE: 200

tcp   LISTEN  0  128  127.0.0.1:8889  0.0.0.0:*
```

---

## 第四部分：验证双服务运行状态

### 4.1 检查两个服务状态

```bash
echo "=== 服务状态 ===" && \
systemctl --user is-active jupyter jupyterlab | paste - - && \
echo "" && \
echo "=== 端口监听 ===" && \
netstat -tlnp 2>/dev/null | grep -E "8888|8889" || ss -tlnp | grep -E "8888|8889"
```

**预期结果**：

```text
=== 服务状态 ===
active  active

=== 端口监听 ===
tcp  LISTEN  0  128  127.0.0.1:8888  0.0.0.0:*
tcp  LISTEN  0  128  127.0.0.1:8889  0.0.0.0:*
```

### 4.2 测试两个 Jupyter API

```bash
echo "=== Jupyter Notebook (8888) ===" && \
curl -s "http://localhost:8888/api?token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359" && \
echo "" && \
echo "=== JupyterLab (8889) ===" && \
curl -s "http://localhost:8889/api?token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"
```

**预期结果**：

```text
=== Jupyter Notebook (8888) ===
{"version": "..."}
=== JupyterLab (8889) ===
{"version": "2.17.0"}
```

---

## 第五部分：配置 MCP 客户端

### 5.1 Windsurf (Codeium) 配置

编辑 `~/.codeium/windsurf/mcp_config.json`，在 `mcpServers` 中添加以下配置：

```json
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "node",
      "args": ["/mnt/data/mcp/mcp-jupyter-complete/src/index.js"],
      "disabled": false,
      "env": {
        "JUPYTER_URL": "http://localhost:8888",
        "JUPYTER_TOKEN": "ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"
      }
    },
    "jupyter-mcp-server": {
      "command": "uvx",
      "args": ["jupyter-mcp-server@latest"],
      "disabled": false,
      "env": {
        "JUPYTER_URL": "http://localhost:8889",
        "JUPYTER_TOKEN": "ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359",
        "ALLOW_IMG_OUTPUT": "true"
      }
    }
  }
}
```

### 5.2 一键添加配置脚本

```bash
# 备份原配置
cp ~/.codeium/windsurf/mcp_config.json ~/.codeium/windsurf/mcp_config.json.bak 2>/dev/null || true

# 如果配置文件不存在，创建初始配置
if [ ! -f ~/.codeium/windsurf/mcp_config.json ]; then
  mkdir -p ~/.codeium/windsurf
  echo '{"mcpServers":{}}' > ~/.codeium/windsurf/mcp_config.json
fi

# 添加双 MCP 配置
cat ~/.codeium/windsurf/mcp_config.json | python3 -c "
import json, sys
config = json.load(sys.stdin)
config['mcpServers']['jupyter-complete'] = {
    'command': 'node',
    'args': ['/mnt/data/mcp/mcp-jupyter-complete/src/index.js'],
    'disabled': False,
    'env': {
        'JUPYTER_URL': 'http://localhost:8888',
        'JUPYTER_TOKEN': 'ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359'
    }
}
config['mcpServers']['jupyter-mcp-server'] = {
    'command': 'uvx',
    'args': ['jupyter-mcp-server@latest'],
    'disabled': False,
    'env': {
        'JUPYTER_URL': 'http://localhost:8889',
        'JUPYTER_TOKEN': 'ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359',
        'ALLOW_IMG_OUTPUT': 'true'
    }
}
print(json.dumps(config, indent=2))
" > /tmp/mcp_config_new.json && mv /tmp/mcp_config_new.json ~/.codeium/windsurf/mcp_config.json

# 验证配置
cat ~/.codeium/windsurf/mcp_config.json | python3 -c "import json,sys; d=json.load(sys.stdin); print('已配置的 MCP:', list(d.get('mcpServers',{}).keys()))"
```

**预期结果**：

```text
已配置的 MCP: ['jupyter-complete', 'jupyter-mcp-server', ...]
```

### 5.3 Claude Desktop 配置

编辑 `~/.claude.json`：

```json
{
  "mcpServers": {
    "jupyter-complete": {
      "command": "ssh",
      "args": [
        "cpu@服务器IP",
        "cd /mnt/data/mcp/mcp-jupyter-complete && JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 node src/index.js"
      ]
    },
    "jupyter-mcp-server": {
      "command": "ssh",
      "args": [
        "cpu@服务器IP",
        "JUPYTER_URL=http://localhost:8889 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 ALLOW_IMG_OUTPUT=true uvx jupyter-mcp-server@latest"
      ]
    }
  }
}
```

### 5.4 Cursor 配置

在 Cursor 设置的 MCP 配置中添加：

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
    },
    "jupyter-exec": {
      "command": "uvx",
      "args": ["jupyter-mcp-server@latest"],
      "env": {
        "JUPYTER_URL": "http://localhost:8889",
        "JUPYTER_TOKEN": "ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359",
        "ALLOW_IMG_OUTPUT": "true"
      }
    }
  }
}
```

---

## 第六部分：最终验证

### 6.1 重启客户端应用

配置完成后，**重启 Windsurf / Cursor / Claude Desktop** 等客户端。

### 6.2 测试 MCP 工具

在客户端对话中测试：

```text
请使用 jupyter-complete 的 list_cells 工具列出某个 notebook 的单元格
```

```text
请使用 jupyter-mcp-server 的 list_files 工具列出 JupyterLab 服务器上的文件
```

---

## 常用管理命令

### 服务管理

```bash
# 查看所有服务状态
systemctl --user status jupyter jupyterlab

# 重启服务
systemctl --user restart jupyter
systemctl --user restart jupyterlab

# 停止服务
systemctl --user stop jupyter
systemctl --user stop jupyterlab

# 查看日志
journalctl --user -u jupyter -f
journalctl --user -u jupyterlab -f
```

### 环境管理

```bash
# 查看所有 conda 环境
conda env list

# 激活环境
conda activate mcp-jupyter-complete
conda activate jupyter-mcp-server

# 删除环境（如需重建）
conda env remove -n mcp-jupyter-complete
conda env remove -n jupyter-mcp-server
```

### 测试 MCP 服务器

```bash
# 测试 mcp-jupyter-complete
cd /mnt/data/mcp/mcp-jupyter-complete
JUPYTER_URL=http://localhost:8888 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 node src/index.js

# 测试 jupyter-mcp-server
JUPYTER_URL=http://localhost:8889 JUPYTER_TOKEN=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359 uvx jupyter-mcp-server@latest --help
```

---

## 部署概览

| 组件 | mcp-jupyter-complete | jupyter-mcp-server |
|-----|---------------------|-------------------|
| **conda 环境** | `mcp-jupyter-complete` | `jupyter-mcp-server` |
| **Jupyter 类型** | Notebook | JupyterLab 4.4.1 |
| **端口** | 8888 | 8889 |
| **systemd 服务** | `jupyter.service` | `jupyterlab.service` |
| **MCP 启动方式** | `node src/index.js` | `uvx jupyter-mcp-server@latest` |
| **主要用途** | 快速文件编辑 | 代码执行、多 notebook 管理 |

---

## 故障排除

### 1. 服务启动失败

```bash
# 查看详细日志
journalctl --user -u jupyter -n 50
journalctl --user -u jupyterlab -n 50

# 手动测试启动命令
conda run -n mcp-jupyter-complete jupyter notebook --no-browser --ip=127.0.0.1 --port=8888 --NotebookApp.token=test
conda run -n jupyter-mcp-server jupyter lab --no-browser --ip=127.0.0.1 --port=8889 --IdentityProvider.token=test
```

### 2. 端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep -E "8888|8889"
sudo lsof -i :8888
sudo lsof -i :8889

# 杀死占用进程
sudo kill -9 <PID>
```

### 3. pycrdt 导入错误

```bash
# 确认 datalayer_pycrdt 已安装
conda run -n jupyter-mcp-server pip list | grep pycrdt

# 如果显示 pycrdt 而不是 datalayer_pycrdt，重新处理
conda run -n jupyter-mcp-server pip uninstall -y pycrdt
conda run -n jupyter-mcp-server pip install datalayer_pycrdt==0.12.17
```

### 4. MCP 客户端连接失败

```bash
# 确认 Jupyter 服务运行
curl "http://localhost:8888/api?token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"
curl "http://localhost:8889/api?token=ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"

# 确认 Token 正确
# 检查 systemd 服务配置中的 Token 是否与客户端配置一致
```

---

## 注意事项

1. **pycrdt 依赖**：安装 `jupyter-mcp-server` 时会覆盖 `datalayer_pycrdt`，必须再次替换
2. **端口隔离**：两个服务使用不同端口（8888 和 8889），避免冲突
3. **Token 统一**：两个服务使用相同的 Token，简化配置
4. **服务独立**：两个 systemd 服务独立运行，可单独重启
5. **用户 lingering**：确保用户 lingering 已启用，允许服务在未登录时运行

   ```bash
   loginctl enable-linger $USER
   ```

---

## 快速检查清单

- [ ] Node.js 已安装 (`node --version`)
- [ ] uv 已安装 (`uv --version`)
- [ ] conda 环境 `mcp-jupyter-complete` 已创建
- [ ] conda 环境 `jupyter-mcp-server` 已创建
- [ ] mcp-jupyter-complete 仓库已克隆并安装 (`npm install`)
- [ ] jupyter-mcp-server 依赖已安装 (JupyterLab 4.4.1 + datalayer_pycrdt)
- [ ] jupyter.service 服务运行正常 (端口 8888)
- [ ] jupyterlab.service 服务运行正常 (端口 8889)
- [ ] MCP 客户端配置已添加
- [ ] 客户端已重启并验证 MCP 工具可用
