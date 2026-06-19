@echo off
echo ===================================================
echo   StockWise - Local Development Orchestrator
echo ===================================================
echo.

echo [1/3] Installing React Frontend Dependencies...
cd frontend
call npm install
cd ..
echo.

echo [2/3] Starting FastAPI Backend on Port 8000...
echo (Using SQLite database fallback since Docker daemon is offline)
start cmd /k "cd backend && venv\Scripts\python -m uvicorn app.main:app --port 8000 --reload"
echo.

echo [3/3] Starting React Dev Server on Port 5173...
start cmd /k "cd frontend && npm run dev"
echo.

echo ===================================================
echo   StockWise is running successfully!
echo   - Frontend UI: http://localhost:5173
echo   - Backend API: http://localhost:8000
echo   - API Swagger Docs: http://localhost:8000/docs
echo ===================================================
pause
