@echo off
setlocal
title Toy - Deploy
pushd "%~dp0" || goto folder_error

if not exist "wrangler.jsonc" goto missing_config
if not exist "public\index.html" goto missing_files
where npx >nul 2>nul
if errorlevel 1 goto missing_node

echo Deploying Toy to Cloudflare...
echo.
call npx wrangler deploy
set "deploy_result=%errorlevel%"
echo.
if not "%deploy_result%"=="0" goto deploy_error

echo Deployment completed successfully.
popd
pause
exit /b 0

:deploy_error
echo Deployment failed. Check the error message above.
popd
pause
exit /b %deploy_result%

:missing_config
echo ERROR: wrangler.jsonc was not found next to this BAT file.
goto local_error

:missing_files
echo ERROR: public\index.html was not found. Check your website files.
goto local_error

:missing_node
echo ERROR: npx was not found. Install Node.js or check PATH.
goto local_error

:local_error
popd
pause
exit /b 1

:folder_error
echo ERROR: Could not open the project folder.
pause
exit /b 1
