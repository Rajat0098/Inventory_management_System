@echo off
echo ===================================================
echo   StockWise - Docker Hub Image Build & Push
echo ===================================================
echo.
echo Please ensure Docker Desktop is open and the green "running"
echo status is active before proceeding.
echo.
pause

echo.
echo [1/3] Building backend Docker image...
docker build -t rajat0070/stockwise-backend:latest ./backend
if %errorlevel% neq 0 (
    echo Error during build. Please make sure Docker Desktop is running.
    pause
    exit /b %errorlevel%
)
echo.

echo [2/3] Logging into Docker Hub...
docker login
echo.

echo [3/3] Pushing image to Docker Hub...
docker push rajat0070/stockwise-backend:latest
if %errorlevel% neq 0 (
    echo Error during push.
    pause
    exit /b %errorlevel%
)
echo.

echo ===================================================
echo   Successfully pushed to Docker Hub!
echo   Link: https://hub.docker.com/r/rajat0070/stockwise-backend
echo ===================================================
pause
