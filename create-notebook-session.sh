#!/bin/bash

# 为 notebook 创建 Jupyter kernel 会话的辅助脚本
# 用法: ./create-notebook-session.sh /path/to/notebook.ipynb

set -e

NOTEBOOK_PATH="$1"
JUPYTER_URL="${JUPYTER_URL:-http://localhost:8888}"
JUPYTER_TOKEN="${JUPYTER_TOKEN:-ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359}"

if [ -z "$NOTEBOOK_PATH" ]; then
    echo "用法: $0 <notebook_path>"
    echo "示例: $0 /mnt/data/mcp/mcp-jupyter-complete/examples/demo-notebook.ipynb"
    exit 1
fi

if [ ! -f "$NOTEBOOK_PATH" ]; then
    echo "❌ 错误: 文件不存在: $NOTEBOOK_PATH"
    exit 1
fi

echo "🔍 检查 Jupyter 服务器状态..."

# 检查 Jupyter 服务器是否运行
if ! curl -s "${JUPYTER_URL}/api?token=${JUPYTER_TOKEN}" > /dev/null; then
    echo "❌ 错误: 无法连接到 Jupyter 服务器 ${JUPYTER_URL}"
    echo "请确保 Jupyter 服务器正在运行"
    exit 1
fi

echo "✅ Jupyter 服务器连接正常"

# 获取可用的 kernels
echo "🔍 获取可用的 kernels..."
KERNELS=$(curl -s "${JUPYTER_URL}/api/kernels?token=${JUPYTER_TOKEN}")
KERNEL_COUNT=$(echo "$KERNELS" | jq length)

if [ "$KERNEL_COUNT" -eq 0 ]; then
    echo "⚠️  没有可用的 kernels，创建新的 kernel..."
    
    # 尝试创建新的 kernel
    NEW_KERNEL=$(curl -X POST "${JUPYTER_URL}/api/kernels?token=${JUPYTER_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"name": "python3"}' 2>/dev/null)
    
    if echo "$NEW_KERNEL" | jq -e '.id' > /dev/null 2>&1; then
        KERNEL_ID=$(echo "$NEW_KERNEL" | jq -r '.id')
        echo "✅ 创建了新的 kernel: $KERNEL_ID"
    else
        echo "❌ 无法创建新的 kernel"
        echo "错误信息: $NEW_KERNEL"
        exit 1
    fi
else
    # 使用第一个可用的 kernel
    KERNEL_ID=$(echo "$KERNELS" | jq -r '.[0].id')
    echo "✅ 使用现有的 kernel: $KERNEL_ID"
fi

# 检查是否已经有会话
NOTEBOOK_NAME=$(basename "$NOTEBOOK_PATH")
echo "🔍 检查现有会话..."

EXISTING_SESSION=$(curl -s "${JUPYTER_URL}/api/sessions?token=${JUPYTER_TOKEN}" | \
    jq -r ".[] | select(.path == \"$NOTEBOOK_PATH\") | .id")

if [ -n "$EXISTING_SESSION" ]; then
    echo "ℹ️  发现现有会话: $EXISTING_SESSION"
    echo "✅ notebook 已经有活跃的 kernel 会话"
    exit 0
fi

# 创建新的会话
echo "🚀 为 notebook 创建新的 kernel 会话..."

SESSION_DATA=$(cat <<EOF
{
    "path": "$NOTEBOOK_PATH",
    "name": "$NOTEBOOK_NAME",
    "type": "notebook",
    "kernel": {
        "id": "$KERNEL_ID"
    }
}
EOF
)

NEW_SESSION=$(curl -X POST "${JUPYTER_URL}/api/sessions?token=${JUPYTER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$SESSION_DATA" 2>/dev/null)

if echo "$NEW_SESSION" | jq -e '.id' > /dev/null 2>&1; then
    SESSION_ID=$(echo "$NEW_SESSION" | jq -r '.id')
    echo "✅ 成功创建会话: $SESSION_ID"
    echo ""
    echo "📋 会话信息:"
    echo "- 会话 ID: $SESSION_ID"
    echo "- Kernel ID: $KERNEL_ID"
    echo "- Notebook: $NOTEBOOK_PATH"
    echo ""
    echo "🎉 现在可以使用 execute_cell 功能了！"
else
    echo "❌ 创建会话失败"
    echo "错误信息: $NEW_SESSION"
    exit 1
fi
