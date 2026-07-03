@echo off
rem Launches the Super API testing dashboard.
rem Chrome blocks API calls from file:// pages, so we serve over localhost.
cd /d "%~dp0"
start "" "http://localhost:8734/api-testing-dashboard.html"
python -m http.server 8734
