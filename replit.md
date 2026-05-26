# MR Express — Telegram Mini App + Admin Panel

## Project Overview

A full e-commerce platform built for Telegram Mini Apps, consisting of:

- **Admin Panel** (primary UI on port 5000) — React 19 + TypeScript + Vite with iOS Glassmorphism design
- **Mini App Frontend** (port 5001) — React 18 + Vite Telegram WebApp
- **Admin Backend API** (port 8008) — FastAPI + SQLite
- **Mini App Backend API** (port 8000) — FastAPI + SQLite + Aiogram 3

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, TypeScript (admin)
- **Backend:** Python 3.12, FastAPI, uvicorn, aiosqlite
- **Database:** SQLite (shared between both backends via `mr express/backend/data/mrexpress.db`)
- **Telegram:** @twa-dev/sdk, Aiogram 3

## Project Structure

```
mr express/          # Telegram Mini App
  backend/           # FastAPI + Aiogram (port 8000)
  frontend/          # React Mini App (port 5001)

mr express admin/    # Admin Panel
  backend/           # FastAPI admin API (port 8008)
  frontend/          # React Admin UI (port 5000, main)
```

## Running the App

Three workflows are configured:
- **Start application** — Admin Panel frontend (port 5000, webview)
- **Mini App Backend** — Telegram Mini App backend API (port 8000)
- **Admin Backend** — Admin panel backend API (port 8008)

## Configuration

- Admin backend config: `mr express admin/backend/app/core/config.py`
- Mini app backend config: `mr express/backend/app/config.py`
- Database path (shared): `mr express/backend/data/mrexpress.db`
- Bot token: set `BOT_TOKEN` in environment secrets

## User Preferences

- Language: Uzbek UI (app interface in Uzbek)
- Keep existing project structure
