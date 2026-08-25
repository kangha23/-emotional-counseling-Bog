@echo off
title JinXuan - Local Dev
cd /d "%~dp0"
for /f "tokens=1,* delims==" %%a in (.env.local) do (
  if "%%a"=="GEMINI_API_KEY" set "GEMINI_API_KEY=%%b"
)
echo ========================================
echo   JinXuan local dev: http://localhost:3000
echo   (Cua tab nay = tat server)
echo ========================================
vercel dev --listen 3000
pause
