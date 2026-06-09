#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "🔧 仅启动后端服务..."
echo "📡 监听地址: http://127.0.0.1:8602"

cd "$PROJECT_ROOT/backend"
if [ ! -d "node_modules" ]; then
  echo "安装依赖..."
  npm install --registry https://registry.npmmirror.com
fi

node src/init.js
node src/server.js
