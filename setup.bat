@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

echo ============================================
echo  EquipaHub - Setup e Inicializacao
echo ============================================
echo.

:: Verifica Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERRO: Python nao encontrado. Instale Python 3.10+ em https://python.org
    pause
    exit /b 1
)

:: Verifica Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERRO: Node.js nao encontrado. Instale em https://nodejs.org
    pause
    exit /b 1
)

echo [1/6] Criando ambiente virtual Python...
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [2/6] Instalando dependencias Python...
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo ERRO ao instalar dependencias Python.
    pause
    exit /b 1
)

echo [3/6] Executando migrations...
python manage.py migrate
if %ERRORLEVEL% neq 0 (
    pause
    exit /b 1
)

echo [4/6] Criando dados iniciais...
python manage.py create_initial_data
if %ERRORLEVEL% neq 0 (
    pause
    exit /b 1
)

echo [5/6] Instalando dependencias do frontend...
cd ..
if not exist node_modules (
    npm install
)
if %ERRORLEVEL% neq 0 (
    echo ERRO ao instalar dependencias do frontend.
    pause
    exit /b 1
)

echo [6/6] A iniciar servidores...
echo.
echo ============================================
echo  Credenciais de acesso:
echo  Admin:  admin@unihub.com / admin123
echo  Tecnico:  tecnico@unihub.com / admin123
echo  Secretaria: secretaria@unihub.com / admin123
echo  Docente: ana.santos@unihub.com / admin123
echo ============================================
echo.

:: Inicia backend numa nova janela
start "EquipaHub Backend" cmd /c "cd /d %CD%\backend && call venv\Scripts\activate.bat && python manage.py runserver 0.0.0.0:8000"

:: Aguarda backend iniciar
echo A aguardar backend (localhost:8000)...
:wait_loop
timeout /t 2 /nobreak >nul
curl -s http://localhost:8000/api/v1/auth/me/ >nul 2>&1
if %ERRORLEVEL% neq 0 (
    goto wait_loop
)

echo Backend pronto!

:: Inicia frontend
echo A iniciar frontend (localhost:8080)...
start "EquipaHub Frontend" cmd /c "cd /d %CD% && npx vite --port 8080 --host 0.0.0.0"

echo.
echo ============================================
echo  Frontend: http://localhost:8080
echo  Backend:  http://localhost:8000
echo  Admin:    http://localhost:8080/login
echo ============================================
echo.
pause
