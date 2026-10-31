@echo off
setlocal
set "PYTHONUTF8=1"
cd /d "%~dp0"
C:\TempPy13\python.exe "%~dp0scripts\build_candidate_batches.py"
pause
