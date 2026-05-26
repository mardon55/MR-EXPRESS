# MR-Express Admin Panel — Arxitektura

## Loyiha tuzilishi

```
mr-express-admin/
├── docs/                          # Hujjatlar
│   ├── ARCHITECTURE.md
│   ├── API_ENDPOINTS.md
│   └── DATABASE_SCHEMA.md
├── frontend/                      # React + Vite + Tailwind + Framer Motion
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # Sidebar, Header, AdminLayout
│   │   │   └── ui/                # GlassCard, StatCard, ThemeToggle
│   │   ├── constants/             # navigation, enums
│   │   ├── contexts/              # ThemeContext
│   │   ├── hooks/                 # useApi, useAuth (keyingi bosqich)
│   │   ├── lib/                   # api client, utils
│   │   ├── pages/                 # sahifalar modul bo'yicha
│   │   ├── routes/                # React Router
│   │   ├── types/                 # TypeScript interfeyslar
│   │   └── services/              # API servis qatlami (keyingi bosqich)
│   ├── tailwind.config.js
│   └── vite.config.ts
└── backend/                       # FastAPI + PostgreSQL
    ├── app/
    │   ├── main.py
    │   ├── core/                  # config, database, security
    │   ├── models/                # SQLAlchemy modellar
    │   ├── schemas/               # Pydantic schemalar
    │   ├── api/
    │   │   └── v1/
    │   │       ├── router.py
    │   │       └── endpoints/     # orders, banners, ...
    │   ├── services/              # biznes logika
    │   └── repositories/        # DB qatlami (ixtiyoriy)
    ├── alembic/                   # migratsiyalar
    ├── requirements.txt
    └── .env.example
```

## Dizayn tizimi (Glassmorphism)

| Token | Ma'nosi |
|-------|---------|
| `glass-panel` | Asosiy shisha kartochka (`backdrop-blur`, transparency) |
| `glass-panel-strong` | Sidebar kabi qalin blur |
| `glass-button` | Interaktiv tugmalar |
| `nav-item-active` | Faol navigatsiya holati |
| `bg-mesh-dark` / `bg-mesh-light` | Fon gradient mesh |

## Modullar xaritasi

| Modul | Frontend route | Backend prefix |
|-------|----------------|----------------|
| Dashboard | `/` | `/api/v1/dashboard` |
| Buyurtmalar | `/orders` | `/api/v1/orders` |
| Bannerlar | `/banners` | `/api/v1/banners` |
| Chegirmalar | `/discounts` | `/api/v1/discounts` |
| Reels | `/reels` | `/api/v1/reels` |
| Katalog | `/catalog` | `/api/v1/catalog` |
| Guruhli xarid | `/group-buy` | `/api/v1/group-buys` |
| Promokodlar | `/promocodes` | `/api/v1/promocodes` |
| Sharhlar | `/reviews` | `/api/v1/reviews` |

## Kengaytirish qoidalari

1. Har bir modul uchun: `pages/`, `services/`, `types/`, `backend/endpoints/`.
2. UI komponentlari `components/ui/` da qayta ishlatiladi.
3. API chaqiruvlari faqat `lib/api.ts` va modul `services/` orqali.
