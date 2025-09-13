#!/bin/bash

# MCP Jupyter Complete 环境设置脚本
# 用于创建专用的 conda 环境，避免污染 base 环境

set -e  # 遇到错误时退出

echo "🚀 开始设置 MCP Jupyter Complete 环境..."

# 检查 conda 是否可用
if ! command -v conda &> /dev/null; then
    echo "❌ 错误: conda 未找到，请先安装 Miniconda 或 Anaconda"
    exit 1
fi

echo "✅ 检测到 conda: $(conda --version)"

# 环境名称
ENV_NAME="mcp-jupyter-complete"

# 检查环境是否已存在
if conda env list | grep -q "^${ENV_NAME}"; then
    echo "⚠️  环境 ${ENV_NAME} 已存在"
    read -p "是否删除现有环境并重新创建? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  删除现有环境..."
        conda env remove -n ${ENV_NAME} -y
    else
        echo "❌ 取消操作"
        exit 1
    fi
fi

echo "📦 创建新的 conda 环境: ${ENV_NAME}"
conda create -n ${ENV_NAME} python=3.9 -y

echo "🔧 激活环境并安装必要的包..."

# 激活环境并安装包
eval "$(conda shell.bash hook)"
conda activate ${ENV_NAME}

echo "📥 安装 Jupyter 相关包..."
conda install jupyter jupyter_client jupyter_core -y

echo "📥 安装 pandoc (用于格式转换)..."
conda install pandoc -y

echo "📥 安装 nbconvert (用于 notebook 转换)..."
conda install nbconvert -y

echo "📥 安装其他必要的包..."
conda install ipykernel ipywidgets -y

echo "📥 安装常用的数据科学包..."
conda install numpy pandas matplotlib seaborn -y

echo "🔧 注册 Jupyter kernel..."
python -m ipykernel install --user --name ${ENV_NAME} --display-name "MCP Jupyter Complete"

echo "✅ 验证安装..."
echo "Jupyter 版本: $(jupyter --version | head -1)"
echo "Pandoc 版本: $(pandoc --version | head -1)"
echo "Python 版本: $(python --version)"

echo "📋 检查已安装的包..."
conda list | grep -E "(jupyter|pandoc|numpy|pandas)"

echo "🎉 环境设置完成！"
echo ""
echo "📝 使用说明:"
echo "1. 激活环境: conda activate ${ENV_NAME}"
echo "2. 启动 Jupyter: jupyter notebook"
echo "3. 查看可用 kernels: jupyter kernelspec list"
echo ""
echo "🔧 下一步:"
echo "1. 配置 systemd 服务 (参考教程)"
echo "2. 设置 MCP 客户端连接"
echo "3. 测试 MCP 工具功能"
echo ""
echo "📁 环境位置: $(conda info --envs | grep ${ENV_NAME} | awk '{print $NF}')"

# 导出环境配置
echo "💾 导出环境配置到 ${ENV_NAME}.yml..."
conda env export > ${ENV_NAME}.yml
echo "✅ 环境配置已保存到 ${ENV_NAME}.yml"

echo ""
echo "🎯 快速测试命令:"
echo "conda activate ${ENV_NAME} && jupyter --version"
