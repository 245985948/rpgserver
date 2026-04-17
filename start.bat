@echo off
chcp 65001 >nul
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║     太墟修仙录服务端启动脚本                               ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

:: 检查 Node.js
echo [1/4] 检查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Node.js 未安装，请先安装 Node.js 18.x 或更高版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo [✓] Node.js 已安装

:: 检查 MongoDB
echo.
echo [2/4] 检查 MongoDB...
net start | findstr /i "MongoDB" >nul
if %errorlevel% neq 0 (
    echo [警告] MongoDB 服务未运行，尝试启动...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo [错误] 无法启动 MongoDB，请手动启动
        echo 命令: mongod --dbpath="C:\data\db"
        pause
        exit /b 1
    )
)
echo [✓] MongoDB 已运行

:: 检查 Redis
echo.
echo [3/4] 检查 Redis...
tasklist | findstr /i "redis-server" >nul
if %errorlevel% neq 0 (
    echo [警告] Redis 未运行，请在新窗口中运行: redis-server
    echo.
    choice /C YN /M "是否继续启动(数据库可能连接失败)"
    if %errorlevel% neq 1 (
        exit /b 1
    )
) else (
    echo [✓] Redis 已运行
)

:: 检查 node_modules
echo.
echo [4/4] 检查依赖...
if not exist "node_modules" (
    echo [信息] 首次运行，安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)
echo [✓] 依赖已安装

:: 检查 .env 文件
echo.
if not exist ".env" (
    echo [信息] 创建 .env 配置文件...
    copy .env.example .env >nul
    echo [注意] 请编辑 .env 文件配置数据库连接
)

:: 启动服务
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                   启动开发服务器...                        ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 按 Ctrl+C 停止服务
echo.

npm run start:dev

pause
