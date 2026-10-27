@echo off
cd /d "%~dp0"
if not exist "..\glpi-back\Dockerfile" (
  echo Coloque a pasta glpi-back ao lado desta.
  exit /b 1
)
docker version >nul 2>&1
if errorlevel 1 (
  echo Abra o Docker antes de continuar.
  exit /b 1
)
docker compose up -d --build
if errorlevel 1 exit /b 1
echo.
echo Front, API, banco e Nginx estao no ar.
echo Abra http://localhost
