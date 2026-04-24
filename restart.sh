#!/bin/bash

# 太墟修仙录服务器一键重启脚本 (Linux/Mac/WSL)

echo "============================================"
echo "   太墟修仙录服务器一键重启工具"
echo "============================================"
echo ""

# 查找并结束占用 3000 端口的进程
echo "[1/3] 正在查找占用 3000 端口的进程..."
PID=$(lsof -t -i:3000 2>/dev/null || netstat -tlnp 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d'/' -f1)

if [ -n "$PID" ]; then
    echo "       发现进程 PID: $PID"
    echo "[2/3] 正在结束进程..."
    kill -9 $PID 2>/dev/null || sudo kill -9 $PID 2>/dev/null
    echo "       进程已结束"
else
    echo "       未发现占用 3000 端口的进程"
fi

sleep 2

# 检查端口是否释放
echo "[3/3] 检查端口状态..."
if lsof -i:3000 >/dev/null 2>&1; then
    echo "       警告: 端口仍被占用，尝试强制释放..."
    fuser -k 3000/tcp 2>/dev/null || sudo fuser -k 3000/tcp 2>/dev/null
else
    echo "       端口 3000 已释放"
fi

echo ""
echo "============================================"
echo "正在启动服务器..."
echo "============================================"
echo ""

npm run start:dev
