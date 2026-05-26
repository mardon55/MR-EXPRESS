# MR Express — Telegram Mini App uchun to'g'ri ishga tushirish
# 502 xatolik: tunnel boshqa portga (masalan 5173), backend esa 8000 da bo'lsa yuzaga keladi.

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Write-Host "=== MR Express Telegram rejimi ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1-variant (tavsiya): BITTA port 8000 — API + frontend build" -ForegroundColor Yellow
Write-Host "   Terminal 1: cd backend; python run_api.py"
Write-Host "   Terminal 2: cd frontend; npm run build   (kod o'zgarganda)"
Write-Host "   Terminal 3: npx cloudflared tunnel --url http://localhost:8000"
Write-Host "   Yangi HTTPS URL ni backend\.env va frontend\.env ichidagi WEBAPP_URL / VITE_WEBAPP_URL ga yozing"
Write-Host "   Botni qayta ishga tushiring: python -m bot.main"
Write-Host ""
Write-Host "2-variant: Dev rejim — Vite 5173 + API proxy 8000" -ForegroundColor Yellow
Write-Host "   Terminal 1: cd backend; python run_api.py"
Write-Host "   Terminal 2: cd frontend; npm run dev"
Write-Host "   Terminal 3: npx cloudflared tunnel --url http://localhost:5173"
Write-Host "   frontend\.env: VITE_API_URL=same"
Write-Host ""
Write-Host "Tekshirish:" -ForegroundColor Green
Write-Host "   http://localhost:8000/health  -> status ok"
Write-Host "   http://localhost:5173         -> faqat npm run dev da"
Write-Host ""
