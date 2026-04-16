# run.ps1
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " FraudShield - Credit Card Fraud System  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Check/Create Virtual Environment
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv .venv
}

# 2. Activate Virtual Environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
. .\.venv\Scripts\Activate.ps1

# 3. Install Requirements
Write-Host "Installing requirements..." -ForegroundColor Yellow
pip install -r backend\requirements.txt

# 4. Check/Train Model
if (-not (Test-Path "backend\models\fraud_model.pkl")) {
    Write-Host "Model not found. Running training script..." -ForegroundColor Yellow
    Push-Location backend
    python train_model.py
    Pop-Location
}

# 5. Open Frontend
Write-Host "Opening frontend dashboard in your default browser..." -ForegroundColor Green
Start-Process "frontend\index.html"

# 6. Start Backend
Write-Host "Starting backend API server..." -ForegroundColor Green
Push-Location backend
python app.py
Pop-Location
