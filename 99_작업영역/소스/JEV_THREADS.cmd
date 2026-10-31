@echo off
setlocal
set "PYTHONUTF8=1"
cd /d "%~dp0"

rem Refresh 100-candidate markdown bundles first.
C:\TempPy13\python.exe "%~dp0scripts\build_candidate_batches.py"

if /I "%~1"=="all" goto ALL
if "%~1"=="" (set "N=20") else (set "N=%~1")
C:\TempPy13\python.exe "%~dp0scripts\jev_evaluate_candidates.py" --limit %N%
goto END

:ALL
C:\TempPy13\python.exe "%~dp0scripts\jev_evaluate_candidates.py" --all

:END
pause
