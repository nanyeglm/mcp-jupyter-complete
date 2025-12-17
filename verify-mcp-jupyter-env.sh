#!/bin/bash

# MCP Jupyter Complete 环境验证脚本
# 用于检查环境是否正确配置

set -e

echo "🔍 验证 MCP Jupyter Complete 环境..."

ENV_NAME="mcp-jupyter-complete"

# 检查 conda 是否可用
if ! command -v conda &> /dev/null; then
    echo "❌ 错误: conda 未找到"
    exit 1
fi

echo "✅ Conda 可用: $(conda --version)"

# 检查环境是否存在
if ! conda env list | grep -q "^${ENV_NAME}"; then
    echo "❌ 错误: 环境 ${ENV_NAME} 不存在"
    echo "请先运行 setup-mcp-jupyter-env.sh 创建环境"
    exit 1
fi

echo "✅ 环境 ${ENV_NAME} 存在"

# 激活环境
eval "$(conda shell.bash hook)"
conda activate ${ENV_NAME}

echo "✅ 环境已激活"

# 检查必要的包
echo "🔍 检查必要的包..."

packages=("jupyter" "jupyter_client" "jupyter_core" "pandoc" "nbconvert" "ipykernel" "numpy" "pandas")
missing_packages=()

for package in "${packages[@]}"; do
    if conda list | grep -q "^${package}"; then
        echo "✅ ${package} 已安装"
    else
        echo "❌ ${package} 未安装"
        missing_packages+=("${package}")
    fi
done

if [ ${#missing_packages[@]} -ne 0 ]; then
    echo "❌ 缺少以下包: ${missing_packages[*]}"
    echo "请重新运行安装脚本"
    exit 1
fi

# 检查 Jupyter kernel
echo "🔍 检查 Jupyter kernels..."
if jupyter kernelspec list | grep -q "${ENV_NAME}"; then
    echo "✅ Jupyter kernel ${ENV_NAME} 已注册"
else
    echo "❌ Jupyter kernel ${ENV_NAME} 未注册"
    echo "正在注册 kernel..."
    python -m ipykernel install --user --name ${ENV_NAME} --display-name "MCP Jupyter Complete"
    echo "✅ Kernel 注册完成"
fi

# 测试 Jupyter 启动
echo "🔍 测试 Jupyter 功能..."
echo "Jupyter 版本信息:"
jupyter --version

echo "Pandoc 版本: $(pandoc --version | head -1)"

# 测试 Python 导入
echo "🔍 测试 Python 包导入..."
python -c "
import sys
print(f'Python 版本: {sys.version}')

try:
    import jupyter
    print('✅ jupyter 导入成功')
except ImportError as e:
    print(f'❌ jupyter 导入失败: {e}')

try:
    import pandas
    print('✅ pandas 导入成功')
except ImportError as e:
    print(f'❌ pandas 导入失败: {e}')

try:
    import numpy
    print('✅ numpy 导入成功')
except ImportError as e:
    print(f'❌ numpy 导入失败: {e}')
"

# 检查端口是否被占用
echo "🔍 检查端口 8888 状态..."
if netstat -tlnp 2>/dev/null | grep -q ":8888"; then
    echo "⚠️  端口 8888 已被占用"
    echo "当前占用进程:"
    netstat -tlnp 2>/dev/null | grep ":8888" || true
else
    echo "✅ 端口 8888 可用"
fi

# 检查 systemd 服务（如果存在）
echo "🔍 检查 systemd 服务..."
if systemctl --user list-unit-files | grep -q "jupyter.service"; then
    echo "✅ 发现 jupyter.service"
    echo "服务状态:"
    systemctl --user status jupyter --no-pager || true
else
    echo "ℹ️  未找到 jupyter.service (这是正常的，如果还未配置)"
fi

echo ""
echo "🎉 环境验证完成！"
echo ""
echo "📋 环境摘要:"
echo "- 环境名称: ${ENV_NAME}"
echo "- Python 版本: $(python --version)"
echo "- Jupyter 版本: $(jupyter --version | head -1)"
echo "- 环境路径: $(conda info --envs | grep ${ENV_NAME} | awk '{print $NF}')"
echo ""
echo "🚀 下一步操作:"
echo "1. 配置 systemd 服务启动 Jupyter"
echo "2. 配置 MCP 客户端连接"
echo "3. 测试 MCP 工具功能"
echo ""
echo "💡 快速启动 Jupyter 命令:"
echo "conda activate ${ENV_NAME} && jupyter notebook --no-browser --ip=127.0.0.1 --port=8888"
