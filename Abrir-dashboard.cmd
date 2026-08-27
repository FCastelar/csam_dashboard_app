@echo off
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"
where node.exe >nul 2>&1
if errorlevel 1 (
	echo Node.js nao foi encontrado neste computador.
	echo Instale o Node.js LTS em https://nodejs.org/ e execute este arquivo novamente.
	pause
	exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
	echo Instalando as dependencias do dashboard. Isso acontece apenas na primeira vez.
	call npm.cmd install
	if errorlevel 1 (
		echo Nao foi possivel instalar as dependencias.
		pause
		exit /b 1
	)
)

start "CAF Dashboard Server" /min cmd /c "cd /d "%PROJECT_DIR%" && npm.cmd run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173/"
