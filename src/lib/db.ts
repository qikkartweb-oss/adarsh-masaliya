import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('database.sqlite');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chatbot_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    reply TEXT NOT NULL,
    type TEXT DEFAULT 'keyword', -- 'keyword' or 'menu'
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    customer_phone TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    phone TEXT NOT NULL,
    name TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, phone)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    phone TEXT NOT NULL,
    content TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'inbound' or 'outbound'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL, -- e.g., 'Main Menu'
    welcome_text TEXT NOT NULL,
    is_main INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS menu_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_id INTEGER NOT NULL,
    trigger_number TEXT NOT NULL,
    label TEXT NOT NULL,
    reply_text TEXT,
    action_type TEXT NOT NULL, -- 'text', 'booking', 'submenu', 'support', 'info'
    next_menu_id INTEGER, -- for 'submenu' action
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (menu_id) REFERENCES menus(id)
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    phone TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    current_menu_id INTEGER,
    last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (phone, user_id)
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

export default db;
