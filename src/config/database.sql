CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(100), phone VARCHAR(15) UNIQUE NOT NULL, city VARCHAR(50), address TEXT, fcm_token TEXT, wallet_balance DECIMAL(10,2) DEFAULT 0, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS sellers (id SERIAL PRIMARY KEY, shop_name VARCHAR(150) NOT NULL, owner_name VARCHAR(100), phone VARCHAR(15) UNIQUE NOT NULL, gst_no VARCHAR(20), aadhaar VARCHAR(20), city VARCHAR(50), address TEXT, fcm_token TEXT, verified BOOLEAN DEFAULT FALSE, rating DECIMAL(3,2) DEFAULT 0, total_reviews INT DEFAULT 0, delivery_type VARCHAR(20) DEFAULT 'self', latitude DECIMAL(10,8), longitude DECIMAL(11,8), bank_account VARCHAR(20), bank_ifsc VARCHAR(15), created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, seller_id INT REFERENCES sellers(id) ON DELETE CASCADE, name VARCHAR(200) NOT NULL, description TEXT, category VARCHAR(50), unit VARCHAR(20), price_per_unit DECIMAL(10,2) NOT NULL, stock_qty INT DEFAULT 0, weight_kg DECIMAL(8,2) DEFAULT 0, photos TEXT[] DEFAULT '{}', is_active BOOLEAN DEFAULT TRUE, views INT DEFAULT 0, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), seller_id INT REFERENCES sellers(id), status VARCHAR(30) DEFAULT 'pending', total_amount DECIMAL(10,2) NOT NULL, platform_fee DECIMAL(10,2) DEFAULT 0, seller_amount DECIMAL(10,2) DEFAULT 0, payment_mode VARCHAR(20), payment_status VARCHAR(20) DEFAULT 'pending', razorpay_order_id VARCHAR(100), razorpay_payment_id VARCHAR(100), delivery_address TEXT, delivery_slot VARCHAR(50), otp VARCHAR(6), notes TEXT, invoice_url TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE, product_id INT REFERENCES products(id), qty INT NOT NULL, unit_price DECIMAL(10,2) NOT NULL, subtotal DECIMAL(10,2) NOT NULL);
CREATE TABLE IF NOT EXISTS deliveries (id SERIAL PRIMARY KEY, order_id INT UNIQUE REFERENCES orders(id), driver_name VARCHAR(100), driver_phone VARCHAR(15), vehicle_type VARCHAR(30), vehicle_no VARCHAR(20), lat DECIMAL(10,8), lng DECIMAL(11,8), status VARCHAR(30) DEFAULT 'assigned', estimated_at TIMESTAMP, delivered_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS payments (id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id), method VARCHAR(20), gateway_ref VARCHAR(100), amount DECIMAL(10,2), status VARCHAR(20) DEFAULT 'pending', paid_at TIMESTAMP, settled_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, order_id INT UNIQUE REFERENCES orders(id), user_id INT REFERENCES users(id), seller_id INT REFERENCES sellers(id), rating INT CHECK (rating BETWEEN 1 AND 5), comment TEXT, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, recipient_id INT NOT NULL, recipient_type VARCHAR(10) NOT NULL, type VARCHAR(50), title VARCHAR(200), message TEXT, data JSONB, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS feature_flags (id SERIAL PRIMARY KEY, flag_key VARCHAR(100) UNIQUE NOT NULL, enabled BOOLEAN DEFAULT FALSE, description TEXT, updated_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS price_history (id SERIAL PRIMARY KEY, product_id INT REFERENCES products(id), price DECIMAL(10,2), recorded_at TIMESTAMP DEFAULT NOW());

INSERT INTO sellers (shop_name, owner_name, phone, city, address, verified, rating, delivery_type, latitude, longitude) VALUES ('Sharma Building Materials', 'Ramesh Sharma', '9876500001', 'Ludhiana', 'GT Road, Near Bus Stand', TRUE, 4.5, 'self', 30.9010, 75.8573), ('Punjab Sand & Gravel', 'Gurjeet Singh', '9876500002', 'Ludhiana', 'Industrial Area Phase 2', TRUE, 4.2, 'self', 30.8950, 75.8490), ('Modern Paint & Hardware', 'Sunil Kumar', '9876500003', 'Ludhiana', 'Ferozepur Road', TRUE, 4.7, 'self', 30.9100, 75.8300) ON CONFLICT DO NOTHING;

INSERT INTO products (seller_id, name, description, category, unit, price_per_unit, stock_qty, weight_kg) VALUES (1,'Red Bricks (Standard)','ISI marked fired clay bricks','raw-material','piece',8.50,50000,0.25),(1,'River Sand','Clean washed river sand','raw-material','cubic_ft',45.00,5000,50),(1,'OPC Cement 50kg (UltraTech)','Best for RCC work','raw-material','bag',385.00,1000,50),(1,'TMT Steel Bar 10mm (SAIL)','Fe-500 grade TMT bars','steel','kg',72.00,5000,1),(2,'Stone Aggregate 20mm','For concrete and RCC','raw-material','cubic_ft',55.00,3000,70),(2,'M-Sand (Manufactured)','Fine quality M-sand','raw-material','cubic_ft',38.00,8000,50),(3,'Asian Paints Tractor Emulsion 20L','Premium interior emulsion','paint','tin',2850.00,200,25),(3,'Berger WeatherCoat 10L','Waterproof exterior paint','paint','tin',1950.00,150,12),(3,'Asian Paints Primer 4L','Wall primer','paint','tin',450.00,300,5),(3,'Putty White 40kg','Wall putty for smooth finish','paint','bag',620.00,400,40) ON CONFLICT DO NOTHING;

INSERT INTO feature_flags (flag_key, enabled, description) VALUES ('material_calculator',true,'Material quantity calculator'),('price_history',true,'Weekly price history charts'),('platform_fleet',false,'Platform delivery fleet - month 2'),('bulk_quote',false,'Bulk quote for large orders'),('whatsapp_bot',false,'WhatsApp bot - v2'),('project_wallet',false,'Project wallet - v2') ON CONFLICT DO NOTHING;

SELECT 'DB READY: ' || (SELECT COUNT(*) FROM sellers) || ' sellers, ' || (SELECT COUNT(*) FROM products) || ' products' as status;

-- Add unique constraint so dispatch upsert works
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS id SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS deliveries_order_id_unique ON deliveries(order_id);

-- FCM tokens table for push notifications
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT,
  user_type  VARCHAR(10),
  fcm_token  TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add payment_status to orders if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

SELECT 'Schema additions applied.' as status;
