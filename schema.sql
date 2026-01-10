-- 完整的 schema.sql 修复版
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  email TEXT UNIQUE  -- ✅ 修复：移除 COLUMN
);

CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS poll_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY(poll_id) REFERENCES polls(id)
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL,
  option_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, user_id),
  FOREIGN KEY(poll_id) REFERENCES polls(id),
  FOREIGN KEY(option_id) REFERENCES poll_options(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 确保管理员用户存在
INSERT OR IGNORE INTO users (username, password_hash, role, email) 
VALUES ('OP_GXC', '$2b$10$dummyhashforinitialadmin', 'admin', 'admin@example.com');

-- 确保角色是 admin（即使用户已存在）
UPDATE users SET role = 'admin' WHERE username = 'OP_GXC';