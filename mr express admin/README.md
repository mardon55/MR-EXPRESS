# MR-Express Admin Panel

iOS Glassmorphism dizaynidagi admin dashboard: React + FastAPI + PostgreSQL.

## Ishga tushirish

### Tezkor (Windows)

```powershell
cd "C:\Users\GAS\Desktop\mr express admin"
.\start-dev.ps1
```

### Qo'lda

**Frontend** (majburiy — admin panel UI):

```bash
cd frontend
npm install
npm run dev
```

Brauzer: **http://localhost:5174** (5173 emas!)

**Backend** (API uchun):

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Muammo bo'lsa

| Belgilar | Yechim |
|----------|--------|
| Sahifa ochilmaydi | `http://localhost:5174` ishlating (5173 emas) |
| `No module named uvicorn` | `cd backend` → `pip install -r requirements.txt` |
| `npm` xato | `cd frontend` → `npm install` |
| Bo'sh sahifa | Brauzer cache tozalang yoki Ctrl+Shift+R |

## Hujjatlar

- [Arxitektura](./docs/ARCHITECTURE.md)
- [API Endpoints](./docs/API_ENDPOINTS.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)

## Dizayn (iOS Glassmorphism)

- **Frosted glass:** `frosted-glass`, `bg-white/10`, `backdrop-blur-ios` (20px)
- **Shakl:** `rounded-3xl` / `rounded-4xl`
- **Animatsiya:** Framer Motion `PageTransition` + suyuq o'tishlar
- **Ikonkalar:** Heroicons (outline / solid)
- **Theme:** Dark / Light toggle

## Frontend struktura

```
frontend/src/
├── components/
│   ├── layout/     # Sidebar, MainHeader, PageTransition, BackgroundOrbs
│   └── ui/         # GlassPanel, GlassButton, StatCard, PageHeader
├── layouts/        # AdminLayout
├── pages/          # dashboard, users, orders, products, ...
├── constants/      # navigation.ts (O'zbek)
└── lib/            # motion.ts, utils.ts
```

## Holat

- [x] Professional iOS Glassmorphism UI (qayta qurilgan)
- [x] 10 bo'lim navigatsiyasi + suyuq sahifa o'tishlari
- [x] Boshqaruv paneli (Dashboard) mock statistika
- [ ] Modullar CRUD + backend API
