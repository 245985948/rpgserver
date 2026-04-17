@echo off
chcp 65001 >nul
title 太墟修仙录服务器强制重启工具

color 0C
echo ============================================
echo    太墟修仙录服务器强制重启工具
echo    (会结束所有 Node.js 进程)
echo ============================================
echo.

:: 结束所有 Node.js 进程
echo [1/2] 正在结束所有 Node.js 进程...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
powershell -Command "Get-Process | Where-Object {$_.ProcessName -like '*node*'} | Stop-Process -Force" 2>nul

timeout /t 3 /nobreak >nul

:: 确认端口释放
echo [2/2] 确认端口 3000 状态...
netstat -ano | findstr :3000 >nul
if errorlevel 1 (
    echo        端口已释放，准备启动
) else (
    echo        警告: 端口仍被占用
)

echo.
echo ============================================
echo 正在启动服务器...
echo ============================================
echo.

npm run start:dev

if errorlevel 1 (
    echo.
    echo 启动失败，按任意键退出...
    pause >nul
)
