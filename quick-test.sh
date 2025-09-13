#!/bin/bash

# 快速测试 MCP 工具
export JUPYTER_URL="http://localhost:8888"
export JUPYTER_TOKEN="ac87b951248e6cc6d5c58af49c043fe55412c3928f7df359"

echo "🚀 快速测试 MCP Jupyter Complete 工具"

# 测试 1: 列出工具
echo ""
echo "1️⃣ 测试工具列表..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | timeout 10 node src/index.js 2>/dev/null | grep -q '"tools"' && echo "✅ 工具列表正常" || echo "❌ 工具列表失败"

# 测试 2: list_cells
echo ""
echo "2️⃣ 测试 list_cells..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_cells","arguments":{"notebook_path":"/mnt/data/mcp/mcp-jupyter-complete/test-simple.ipynb"}}}' | timeout 10 node src/index.js 2>/dev/null | grep -q '"result"' && echo "✅ list_cells 正常" || echo "❌ list_cells 失败"

# 测试 3: add_cell
echo ""
echo "3️⃣ 测试 add_cell..."
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"add_cell","arguments":{"notebook_path":"/mnt/data/mcp/mcp-jupyter-complete/test-simple.ipynb","source":"print(\"测试添加的单元格\")","cell_type":"code"}}}' | timeout 10 node src/index.js 2>/dev/null | grep -q '"result"' && echo "✅ add_cell 正常" || echo "❌ add_cell 失败"

# 测试 4: execute_cell
echo ""
echo "4️⃣ 测试 execute_cell..."
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"execute_cell","arguments":{"notebook_path":"/mnt/data/mcp/mcp-jupyter-complete/test-simple.ipynb","cell_id":1}}}' | timeout 15 node src/index.js 2>/dev/null | grep -q '"result"' && echo "✅ execute_cell 正常" || echo "❌ execute_cell 失败"

echo ""
echo "🎯 快速测试完成！"
