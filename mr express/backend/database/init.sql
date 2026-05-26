-- MR Express Telegram Mini App — PostgreSQL schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(128) UNIQUE NOT NULL,
    icon VARCHAR(32) DEFAULT '📦',
    sort_order INT DEFAULT 0
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    old_price DECIMAL(12, 2),
    image_url VARCHAR(512),
    stock INT DEFAULT 100,
    is_featured BOOLEAN DEFAULT FALSE,
    is_discount BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE banners (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    image_url VARCHAR(512),
    link_url VARCHAR(512),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    UNIQUE (user_id, product_id)
);

CREATE TABLE favorites (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(12, 2) NOT NULL,
    status VARCHAR(32) DEFAULT 'pending',
    address TEXT,
    phone VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    price DECIMAL(12, 2) NOT NULL
);

-- Seed data
INSERT INTO categories (name, slug, icon, sort_order) VALUES
    ('Elektronika', 'elektronika', '📱', 1),
    ('Kiyim', 'kiyim', '👕', 2),
    ('Uy-ro''zg''or', 'uy-rozgor', '🏠', 3),
    ('Go''zallik', 'gozallik', '💄', 4),
    ('Oziq-ovqat', 'oziq-ovqat', '🍎', 5);

INSERT INTO banners (title, subtitle, image_url, sort_order) VALUES
    ('Yozgi chegirmalar', '50% gacha', 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800', 1),
    ('Yangi mahsulotlar', 'Eng so''nggi modellar', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', 2),
    ('Bepul yetkazib berish', '100 000 so''mdan yuqori', 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800', 3);

INSERT INTO products (category_id, name, description, price, old_price, image_url, is_featured, is_discount) VALUES
    (1, 'iPhone 15 Pro', 'Apple smartfon, 256GB', 14990000, 16990000, 'https://images.unsplash.com/photo-1695048133142-7a3cb3c8a5c6?w=400', TRUE, TRUE),
    (1, 'Samsung Galaxy S24', 'Flagman Android telefon', 11990000, NULL, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400', TRUE, FALSE),
    (1, 'AirPods Pro 2', 'Shovqinsiz quloqchinlar', 2890000, 3290000, 'https://images.unsplash.com/photo-1606220945770-bfed9a6e0b0d?w=400', TRUE, TRUE),
    (2, 'Erkaklar ko''ylagi', 'Premium paxta', 299000, 399000, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', FALSE, TRUE),
    (2, 'Ayollar sumkasi', 'Zamonaviy dizayn', 450000, NULL, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400', FALSE, FALSE),
    (3, 'Kofe mashinasi', 'Avtomatik espresso', 1890000, 2190000, 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400', TRUE, TRUE),
    (4, 'Parfyum to''plami', '3 ta xil hid', 350000, 450000, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400', FALSE, TRUE),
    (5, 'Organik mevalar', '1 kg to''plam', 89000, NULL, 'https://images.unsplash.com/photo-1610832951502-9d8b3ce3f5e2?w=400', FALSE, FALSE);
