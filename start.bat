@echo off
cd /d "%~dp0"
set "NODE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE=C:\Users\37785\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%NODE%" serve.js
pause
