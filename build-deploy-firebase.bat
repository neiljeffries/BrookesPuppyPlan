@echo off
REM Launch a new cmd window and run all commands in it, keeping the window open
start cmd /k "echo Building Angular app for production... && ^
ng build --configuration production && ^
echo. && echo Build complete. && ^
echo. && echo Waiting 3 seconds before deploying to Firebase... && ^
timeout /t 3 && ^
echo. && echo Deploying to Firebase Hosting... && ^
firebase deploy && ^
echo. && echo Script complete. Press any key to exit. && pause"