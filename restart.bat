@echo off
chcp 65001 >nul
title 太墟修仙录服务器重启工具

:: 设置颜色
color 0A

echo ============================================
echo    太墟修仙录服务器一键重启工具
echo ============================================
echo.

:: 查找并结束占用 3000 端口的进程
echo [1/3] 正在查找占用 3000 端口的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo        发现进程 PID: %%a
    echo [2/3] 正在结束进程...
    taskkill /F /PID %%a 2>nul
    if errorlevel 1 (
        echo        进程结束失败，尝试使用管理员权限...
        powershell -Command "Stop-Process -Id %%a -Force" 2>nul
    ) else (
        echo        进程已结束
    )
    timeout /t 2 /nobreak >nul
)

:: 检查端口是否释放
echo [3/3] 检查端口状态...
netstat -ano | findstr :3000 | findstr LISTENING >nul
if errorlevel 1 (
    echo        端口 3000 已释放
) else (
    echo        警告: 端口仍被占用，尝试强制释放...
    powershell -Command "Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }" 2>nul
)

echo.
echo ============================================
echo 正在启动服务器...
echo ============================================
echo.

:: 启动服务器
npm run start:dev

:: 如果服务器异常退出，暂停显示错误
if errorlevel 1 (
    echo.
    echo 服务器启动失败，按任意键退出...
    pause >nul
)
