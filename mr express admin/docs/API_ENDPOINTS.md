# MR-Express Admin API Endpoints

Base URL: `http://localhost:8000/api/v1`  
Auth: `Bearer <JWT>` (admin rollari uchun)

---

## Dashboard

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/dashboard/stats` | Foydalanuvchilar, buyurtmalar, daromad, faol buyurtmalar |
| GET | `/dashboard/recent-orders` | So'nggi buyurtmalar ro'yxati |

---

## Buyurtmalar (Orders)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/orders` | Ro'yxat (`?status=&page=&limit=`) |
| GET | `/orders/{id}` | Bitta buyurtma |
| POST | `/orders` | Yaratish (admin) |
| PATCH | `/orders/{id}` | Yangilash |
| PATCH | `/orders/{id}/status` | Status: `confirmed`, `processing`, `delivering`, `delivered` |
| DELETE | `/orders/{id}` | O'chirish |

**Status enum:** `confirmed` | `processing` | `delivering` | `delivered`

---

## Bannerlar

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/banners` | Ro'yxat |
| POST | `/banners` | Yaratish (multipart: image) |
| PATCH | `/banners/{id}` | Yangilash |
| DELETE | `/banners/{id}` | O'chirish |
| POST | `/banners/{id}/products` | Mahsulotlarni bog'lash `{ product_ids: [] }` |

---

## Chegirmalar

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/discounts` | Ro'yxat |
| POST | `/discounts` | Vaqt/kun cheklovi bilan yaratish |
| PATCH | `/discounts/{id}` | Yangilash |
| DELETE | `/discounts/{id}` | O'chirish |

**Body misol:** `{ "percent": 15, "valid_from", "valid_to", "days_of_week": [1,2,3] }`

---

## Reels & Mahsulotlar

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/reels` | Reels ro'yxati |
| POST | `/reels` | Video URL/fayl + `product_id` |
| PATCH | `/reels/{id}` | Yangilash |
| DELETE | `/reels/{id}` | O'chirish |

---

## Katalog

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/catalog/categories` | Ierarxik kategoriyalar |
| POST | `/catalog/categories` | Kategoriya yaratish |
| PATCH | `/catalog/categories/{id}` | Yangilash |
| DELETE | `/catalog/categories/{id}` | O'chirish |
| POST | `/catalog/categories/{id}/subcategories` | Sub-kategoriya |
| GET | `/catalog/products` | Mahsulotlar |
| POST | `/catalog/products` | Mahsulot CRUD |

---

## Guruhli xaridlar

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/group-buys` | Ro'yxat |
| POST | `/group-buys` | `{ product_id, required_participants, deadline }` |
| PATCH | `/group-buys/{id}` | Yangilash |
| DELETE | `/group-buys/{id}` | O'chirish |

---

## Promokodlar

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/promocodes` | Ro'yxat |
| POST | `/promocodes` | `{ code, discount_percent, expires_at, max_uses }` |
| PATCH | `/promocodes/{id}` | Yangilash |
| DELETE | `/promocodes/{id}` | O'chirish |

---

## Sharhlar (Moderatsiya)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/reviews` | `?status=pending\|approved` |
| PATCH | `/reviews/{id}/approve` | Tasdiqlash |
| DELETE | `/reviews/{id}` | O'chirish |

---

## Auth (Admin)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| POST | `/auth/login` | `{ email, password }` → JWT |
| POST | `/auth/refresh` | Token yangilash |
| GET | `/auth/me` | Joriy admin |
