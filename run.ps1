# run.ps1
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " FraudShield - Credit Card Fraud System  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Check/Create Virtual Environment
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv .venv
}

$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "ERROR: virtual environment Python not found at $venvPython" -ForegroundColor Red
    exit 1
}

# 2. Install Requirements
Write-Host "Installing requirements..." -ForegroundColor Yellow
& $venvPython -m ensurepip --upgrade
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r backend\requirements.txt

# 3. Check/Train Model
if (-not (Test-Path "backend\models\fraud_model.pkl")) {
    Write-Host "Model not found. Running training script..." -ForegroundColor Yellow
    Push-Location backend
    & $venvPython train_model.py
    Pop-Location
}

# 5. Open Frontend
Write-Host "Opening frontend dashboard in your default browser..." -ForegroundColor Green
Start-Process "frontend\index.html"

# 6. Start Backend
Write-Host "Starting backend API server..." -ForegroundColor Green
Push-Location backend
& $venvPython app.py
Pop-Location
