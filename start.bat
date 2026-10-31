@echo off
echo ========================================================
echo    RuralClass - Multi-Grade Classroom Planning System
echo ========================================================
echo.
echo Starting Backend API on Port 5000...
start cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend on Port 5173...
start cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo RuralClass is launching!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo ========================================================

