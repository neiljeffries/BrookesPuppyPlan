@echo off
REM Launch a new cmd window and run all commands in it, keeping the window open
start cmd /k "echo Building Angular app for production... && ^
ng build --configuration production && ^
echo. && echo Clearing firebase-website folder... && ^
if exist firebase-website rmdir /S /Q firebase-website && ^
mkdir firebase-website && ^
echo. && echo Waiting 2 seconds before copying files... && ^
timeout /t 2 && ^
echo. && echo Copying build output to firebase-website folder... && ^
xcopy /E /Y /C dist\brookes_puppy_plan\browser\* firebase-website\ && ^
echo. && echo Build and copy complete. && ^
echo. && echo Waiting 3 seconds before deploying to Firebase... && ^
timeout /t 3 && ^
echo. && echo Deploying to Firebase Hosting... && ^
firebase deploy && ^
echo. && echo Script complete. Press any key to exit. && pause"