const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose(); // 统一使用sqlite3

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("./"));

const JWT_SECRET = "REPLACE_WITH_YOUR_SECRET";

// 初始化数据库连接
const db = new sqlite3.Database('data.db', (err) => {
    if (err) {
        console.error('数据库连接失败:', err);
    } else {
        console.log('已连接到SQLite数据库');
        initDatabase();
    }
});

// 初始化数据库表
function initDatabase() {
    // 用户表
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 投票相关表
    db.run(`
        CREATE TABLE IF NOT EXISTS polls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS poll_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            poll_id INTEGER,
            text TEXT NOT NULL,
            FOREIGN KEY(poll_id) REFERENCES polls(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            poll_id INTEGER,
            option_id INTEGER,
            user_id INTEGER,
            voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(poll_id) REFERENCES polls(id),
            FOREIGN KEY(option_id) REFERENCES poll_options(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);

    // 验证码表
    db.run(`
        CREATE TABLE IF NOT EXISTS verification_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            type TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('数据库表已初始化');
}

// ========== 工具函数：Promise化db方法 ==========
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// ========== 认证中间件 ==========
function auth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}

function adminOnly(req, res, next) {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    next();
}

// ========== 发送验证码API ==========
app.post("/api/send-verification-code", async (req, res) => {
    try {
        const { email, type } = req.body;

        console.log('收到验证码请求:', { email, type });

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: '邮箱格式不正确' });
        }

        // 检查邮箱是否已存在（注册时）或不存在（找回密码时）
        const user = await dbGet('SELECT id FROM users WHERE email = ?', [email]);

        if (type === 'register') {
            if (user) {
                return res.status(400).json({ error: '该邮箱已被注册' });
            }
        } else if (type === 'forgot-password') {
            if (!user) {
                return res.status(400).json({ error: '该邮箱未注册' });
            }
        } else {
            return res.status(400).json({ error: '无效的验证码类型' });
        }

        // 生成6位数字验证码
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 设置5分钟后过期
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        // 存储验证码
        await dbRun(
            'INSERT OR REPLACE INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
            [email, code, type, expiresAt]
        );

        console.log(`验证码已生成: ${code} 发送到 ${email}`);

        // 实际环境中这里应该调用邮件服务
        res.json({
            message: '验证码已发送到您的邮箱',
            testCode: code // 开发环境使用，生产环境移除
        });

    } catch (error) {
        console.error('发送验证码错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// ========== 注册（带邮箱验证） ==========
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password, code } = req.body;

        console.log('收到注册请求:', { username, email });

        // 基本验证
        if (!username || !email || !password || !code) {
            return res.status(400).json({ error: '缺少必填字段' });
        }

        // 验证验证码
        const verification = await dbGet(
            'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND expires_at > ?',
            [email, code, 'register', new Date().toISOString()]
        );

        if (!verification) {
            return res.status(400).json({ error: '验证码无效或已过期' });
        }

        // 检查用户名是否已存在
        const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        // 检查邮箱是否已存在
        const existingEmail = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existingEmail) {
            return res.status(400).json({ error: '邮箱已被注册' });
        }

        // 哈希密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const result = await dbRun(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        // 删除已使用的验证码
        await dbRun('DELETE FROM verification_codes WHERE email = ? AND type = ?', [email, 'register']);

        res.json({
            success: true,
            message: '注册成功',
            userId: result.lastID
        });

    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '注册失败' });
    }
});

// ========== 登录 ==========
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await dbGet("SELECT * FROM users WHERE username = ?", [username]);
        if (!user) return res.status(401).json({ error: "用户名或密码错误" });

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: "用户名或密码错误" });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token, role: user.role });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '登录失败' });
    }
});

// ========== 重置密码 ==========
app.post("/api/reset-password", async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        // 验证验证码
        const verification = await dbGet(
            'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND expires_at > ?',
            [email, code, 'forgot-password', new Date().toISOString()]
        );

        if (!verification) {
            return res.status(400).json({ error: '验证码无效或已过期' });
        }

        // 哈希新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 更新密码
        await dbRun(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [hashedPassword, email]
        );

        // 删除已使用的验证码
        await dbRun('DELETE FROM verification_codes WHERE email = ? AND type = ?', [email, 'forgot-password']);

        res.json({ message: '密码重置成功' });

    } catch (error) {
        console.error('重置密码错误:', error);
        res.status(500).json({ error: '重置密码失败' });
    }
});

// ========== 以下是原有的投票相关API ==========

// 创建投票（管理员）
app.post("/api/polls", auth, adminOnly, async (req, res) => {
    try {
        const { title, options } = req.body;
        if (!title || !Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ error: "需要标题和至少2个选项" });
        }

        const result = await dbRun(
            "INSERT INTO polls(title, created_by) VALUES (?, ?)",
            [title, req.user.id]
        );

        const pollId = result.lastID;

        // 插入选项
        for (const opt of options) {
            await dbRun("INSERT INTO poll_options(poll_id, text) VALUES (?, ?)", [pollId, opt]);
        }

        res.json({ ok: true, pollId });

    } catch (error) {
        console.error('创建投票错误:', error);
        res.status(500).json({ error: "数据库错误" });
    }
});

// 获取投票列表
app.get("/api/polls", auth, async (req, res) => {
    try {
        const rows = await dbAll("SELECT id, title, created_at FROM polls ORDER BY created_at DESC");
        res.json(rows);
    } catch (error) {
        console.error('获取投票列表错误:', error);
        res.status(500).json({ error: "数据库错误" });
    }
});

// 获取投票详情
app.get("/api/polls/:id", auth, async (req, res) => {
    try {
        const pollId = req.params.id;

        const poll = await dbGet("SELECT * FROM polls WHERE id = ?", [pollId]);
        if (!poll) return res.status(404).json({ error: "投票未找到" });

        const options = await dbAll("SELECT id, text FROM poll_options WHERE poll_id = ?", [pollId]);
        const vote = await dbGet("SELECT * FROM votes WHERE poll_id = ? AND user_id = ?", [pollId, req.user.id]);

        res.json({ poll, options, voted: !!vote });

    } catch (error) {
        console.error('获取投票详情错误:', error);
        res.status(500).json({ error: "数据库错误" });
    }
});

// 投票
app.post("/api/polls/:id/vote", auth, async (req, res) => {
    try {
        const pollId = req.params.id;
        const { optionId } = req.body;

        if (!optionId) return res.status(400).json({ error: "需要选项ID" });

        await dbRun(
            "INSERT INTO votes(poll_id, option_id, user_id) VALUES (?, ?, ?)",
            [pollId, optionId, req.user.id]
        );

        res.json({ ok: true });

    } catch (error) {
        console.error('投票错误:', error);
        res.status(400).json({ error: "已投票或选项无效" });
    }
});

// 获取投票结果
app.get("/api/polls/:id/results", auth, async (req, res) => {
    try {
        const pollId = req.params.id;

        const vote = await dbGet("SELECT * FROM votes WHERE poll_id = ? AND user_id = ?", [pollId, req.user.id]);
        if (!vote) return res.status(403).json({ error: "请先投票才能查看结果" });

        const rows = await dbAll(`
            SELECT o.id, o.text, COUNT(v.id) as count
            FROM poll_options o
            LEFT JOIN votes v ON v.option_id = o.id
            WHERE o.poll_id = ?
            GROUP BY o.id
            ORDER BY count DESC
        `, [pollId]);

        res.json(rows);

    } catch (error) {
        console.error('获取投票结果错误:', error);
        res.status(500).json({ error: "数据库错误" });
    }
});

// 在 server.js 中添加管理员密码重置端点
app.post("/api/admin/reset-password", async (req, res) => {
    try {
        const { username, newPassword, adminToken } = req.body;

        // 简单的管理员验证（生产环境需要更安全的验证）
        if (adminToken !== process.env.ADMIN_RESET_TOKEN) {
            return res.status(403).json({ error: '无权限执行此操作' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await dbRun(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [hashedPassword, username]
        );

        res.json({ message: '密码重置成功' });

    } catch (error) {
        console.error('重置密码错误:', error);
        res.status(500).json({ error: '重置密码失败' });
    }
});

// 启动服务器
app.listen(3000, () => {
    console.log("服务器运行在 http://localhost:3000");
    console.log("可访问地址: http://192.168.1.10:3000");
});