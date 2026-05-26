# MR Express — Telegram Mini App Magazin

Telegram bot + Mini App onlayn do'kon: React (iOS uslubi), Python (Aiogram + FastAPI), PostgreSQL.

## Tuzilma

```
mr express/
├── backend/          # FastAPI API + Aiogram bot
├── frontend/         # React + Tailwind Mini App
├── docker-compose.yml
└── README.md
```

## Bo'limlar

| Bo'lim | Funksiyalar |
|--------|-------------|
| **Bosh sahifa** | Qidiruv, bannerlar, chegirmalar, tavsiyalar |
| **Katalog** | Kategoriyalar, mahsulotlar ro'yxati |
| **Savatcha** | Qo'shish/o'chirish, buyurtma berish |
| **Sevimlilar** | Sevimli mahsulotlar |
| **Profil** | Foydalanuvchi ma'lumotlari, buyurtmalar soni |

## O'rnatish

### 1. PostgreSQL (Docker)

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

`.env` faylini to'ldiring:

```
BOT_TOKEN=123456:ABC...   # @BotFather dan
WEBAPP_URL=http://localhost:5173
DATABASE_URL=postgresql://mrexpress:mrexpress_secret@localhost:5432/mrexpress
```

API va botni ishga tushiring (2 ta terminal):

```bash
# Terminal 1 — API
python run_api.py

# Terminal 2 — Bot
python -m bot.main
```

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Brauzerda: http://localhost:5173 (Telegram tashqarisida test rejimi ishlaydi).

## Telegram ga ulash

1. [@BotFather](https://t.me/BotFather) da bot yarating, token oling.
2. BotFather → `/newapp` yoki Bot Settings → Menu Button → Web App URL.
3. Mini App uchun HTTPS kerak (production):
   - Frontend: `npm run build` → hosting (Vercel, Netlify, nginx)
   - API: serverda `uvicorn` yoki gunicorn
   - `WEBAPP_URL` va `VITE_API_URL` ni haqiqiy domenlarga qo'ying
4. [@BotFather](https://t.me/BotFather) → `/setmenubutton` → Web App URL.

### Ngrok (mahalliy test)

```bash
ngrok http 5173
ngrok http 8000
```

`WEBAPP_URL` = frontend ngrok URL, `VITE_API_URL` = API ngrok URL.

## Texnologiyalar

- **Frontend:** React 18, Vite, Tailwind CSS, Telegram Web App SDK
- **Backend:** Aiogram 3, FastAPI, asyncpg
- **DB:** PostgreSQL 16

## API (qisqacha)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/banners` | Bannerlar |
| GET | `/api/categories` | Kategoriyalar |
| GET | `/api/products` | Mahsulotlar (`?q=`, `?category_id=`) |
| GET | `/api/cart` | Savatcha |
| POST | `/api/cart` | Savatchani yangilash |
| GET/POST | `/api/favorites` | Sevimlilar |
| GET/PATCH | `/api/profile` | Profil |
| POST | `/api/orders` | Buyurtma |

Barcha autentifikatsiya `X-Telegram-User-Id` header orqali (Mini App dan).
