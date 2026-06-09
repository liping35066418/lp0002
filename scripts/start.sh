#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "=========================================="
echo "🐾 宠物门店管理系统 - 启动脚本"
echo "=========================================="

NPM_CMD="npm"
if command -v pnpm >/dev/null 2>&1; then
  NPM_CMD="pnpm"
fi

echo "[1/3] 检查依赖..."
if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
  echo "安装后端依赖..."
  cd "$PROJECT_ROOT/backend" && $NPM_CMD install
fi

if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
  echo "安装前端依赖 (使用 $NPM_CMD)..."
  cd "$PROJECT_ROOT/frontend" && $NPM_CMD install
fi

echo "[2/3] 初始化数据库（首次运行）..."
cd "$PROJECT_ROOT/backend"
node src/init.js

echo "[3/3] 启动服务..."
echo "  - 后端服务: http://127.0.0.1:8602"
echo "  - 前端页面: http://127.0.0.1:3602"
echo "  - 访问限制: 仅允许本机访问"

cd "$PROJECT_ROOT"

trap "kill 0" SIGINT SIGTERM EXIT

(cd "$PROJECT_ROOT/backend" && node src/server.js) &
BACK_PID=$!

(cd "$PROJECT_ROOT/frontend" && npx vite) &
FRONT_PID=$!

echo "=========================================="
echo "✅ 启动完成！"
echo "📊 前端地址: http://127.0.0.1:3602"
echo "🔧 后端API: http://127.0.0.1:8602"
echo "💾 数据库: $PROJECT_ROOT/data/petstore.db"
echo "📝 日志目录: $PROJECT_ROOT/logs"
echo "=========================================="
echo "按 Ctrl+C 停止所有服务"

wait
