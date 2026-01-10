const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("./"));

const JWT_SECRET = "REPLACE_WITH_YOUR_SECRET"; // 实际部署请放到环境变量

// ========== 工具：认证中间件 ==========
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

// ========== 注册 ==========
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });

    const hash = await bcrypt.hash(password, 10);
    db.run(
        "INSERT INTO users(username, password_hash, role) VALUES (?, ?, 'user')",
        [username, hash],
        function (err) {
            if (err) return res.status(400).json({ error: "Username exists" });
            res.json({ ok: true, userId: this.lastID });
        }
    );
});

// ========== 登录 ==========
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: "Invalid credentials" });

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token, role: user.role });
    });
});

// ========== 创建投票（管理员） ==========
app.post("/api/polls", auth, adminOnly, (req, res) => {
    const { title, options } = req.body;
    if (!title || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: "Title and at least 2 options required" });
    }

    db.run(
        "INSERT INTO polls(title, created_by) VALUES (?, ?)",
        [title, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: "DB error" });

            const pollId = this.lastID;
            const stmt = db.prepare("INSERT INTO poll_options(poll_id, text) VALUES (?, ?)");

            options.forEach((opt) => stmt.run(pollId, opt));
            stmt.finalize(() => res.json({ ok: true, pollId }));
        }
    );
});

// ========== 获取投票列表 ==========
app.get("/api/polls", auth, (req, res) => {
    db.all("SELECT id, title, created_at FROM polls ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json(rows);
    });
});

// ========== 获取某个投票详情（含选项；是否投过票） ==========
app.get("/api/polls/:id", auth, (req, res) => {
    const pollId = req.params.id;

    db.get("SELECT * FROM polls WHERE id = ?", [pollId], (err, poll) => {
        if (err || !poll) return res.status(404).json({ error: "Poll not found" });

        db.all("SELECT id, text FROM poll_options WHERE poll_id = ?", [pollId], (err2, options) => {
            if (err2) return res.status(500).json({ error: "DB error" });

            db.get(
                "SELECT * FROM votes WHERE poll_id = ? AND user_id = ?",
                [pollId, req.user.id],
                (err3, vote) => {
                    res.json({
                        poll,
                        options,
                        voted: !!vote,
                    });
                }
            );
        });
    });
});

// ========== 投票 ==========
app.post("/api/polls/:id/vote", auth, (req, res) => {
    const pollId = req.params.id;
    const { optionId } = req.body;

    if (!optionId) return res.status(400).json({ error: "optionId required" });

    db.run(
        "INSERT INTO votes(poll_id, option_id, user_id) VALUES (?, ?, ?)",
        [pollId, optionId, req.user.id],
        (err) => {
            if (err) return res.status(400).json({ error: "Already voted or invalid option" });
            res.json({ ok: true });
        }
    );
});

// ========== 获取投票结果（只有投过票的人才能看） ==========
app.get("/api/polls/:id/results", auth, (req, res) => {
    const pollId = req.params.id;

    db.get(
        "SELECT * FROM votes WHERE poll_id = ? AND user_id = ?",
        [pollId, req.user.id],
        (err, vote) => {
            if (err) return res.status(500).json({ error: "DB error" });
            if (!vote) return res.status(403).json({ error: "Vote first to see results" });

            db.all(
                `
        SELECT o.id, o.text, COUNT(v.id) as count
        FROM poll_options o
        LEFT JOIN votes v ON v.option_id = o.id
        WHERE o.poll_id = ?
        GROUP BY o.id
        ORDER BY count DESC
        `,
                [pollId],
                (err2, rows) => {
                    if (err2) return res.status(500).json({ error: "DB error" });
                    res.json(rows);
                }
            );
        }
    );
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));

// 修改数据库连接配置
const connection = {
    // 本地开发
    development: {
        host: 'localhost',
        user: 'root',
        password: '',
        database: ''
    },
    // 局域网访问
    remote: {
        host: '192.168.1.10',  // 你的电脑IP
        user: 'remote_user',
        password: '',
        database: '',
        port: 3306
    }
};

// 根据环境选择配置
const env = process.env.NODE_ENV || 'development';
const dbConfig = env === 'production' ? connection.remote : connection.development;