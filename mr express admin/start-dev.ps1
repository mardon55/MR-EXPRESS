# MR Express Admin — ikkala serverni ishga tushirish
$root = $PSScriptRoot

Write-Host "MR Express Admin — serverlar ishga tushirilmoqda..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: http://localhost:5174" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Eslatma: Brauzerda 5173 emas, 5174 portini oching!" -ForegroundColor Yellow
Write-Host ""

# Backend
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "cd '$root\backend'; if (-not (Get-Command uvicorn -ErrorAction SilentlyContinue)) { pip install -r requirements.txt }; python -m uvicorn app.main:app --reload --port 8000"
)

Start-Sleep -Seconds 2

# Frontend
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "cd '$root\frontend'; if (-not (Test-Path node_modules)) { npm install }; npm run dev"
)
