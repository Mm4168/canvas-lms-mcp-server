@echo off
echo Fixing Git and pushing changes...

REM Clean up the dist directory if it exists
if exist dist (
    echo Removing dist directory...
    rmdir /s /q dist
)

REM Check if .gitignore exists and add dist if not present
findstr /m "dist/" .gitignore > nul
if %errorlevel%==1 (
    echo Adding dist/ to .gitignore...
    echo dist/ >> .gitignore
)

REM Stage all changes
echo.
echo Staging all changes...
git add .

REM Commit the changes
echo.
echo Committing changes...
git commit -m "Fix TypeScript import paths and build errors for Google Cloud Build" -m "- Fixed relative import paths in all TypeScript files" -m "- Added missing type imports (MCPTextContent, MCPPromptMessage, etc.)" -m "- Fixed import path for config in logger.ts" -m "- Fixed import paths for types" -m "- Updated package.json clean script to use rimraf" -m "- Added rimraf as dev dependency" -m "- Resolved merge conflicts"

REM Push to origin
echo.
echo Pushing to GitHub...
git push origin main

echo.
echo Done! Check the output above for any errors.
pause 