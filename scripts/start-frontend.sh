#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "🎨 仅启动前端开发服务..."
echo "🌐 访问地址: http://127.0.0.1:3602"

cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
  echo "安装依赖..."
  npm install --registry https://registry.npmmirror.com
fi

npx vite --host 127.0.0.1 --port 3602
