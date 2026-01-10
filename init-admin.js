// init-admin.js - 独立的管理员初始化脚本
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const db = new sqlite3.Database('data.db', (err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        process.exit(1);
    }

    console.log('已连接到数据库');
    initAdmin();
});

async function initAdmin() {
    rl.question('请输入管理员 OP_GXC 的新密码: ', async (password) => {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(`
                INSERT OR REPLACE INTO users (username, password_hash, role, email) 
                VALUES (?, ?, ?, ?)
            `, ['OP_GXC', hashedPassword, 'admin', 'admin@example.com'], function (err) {
                if (err) {
                    console.error('❌ 初始化管理员失败:', err);
                } else {
                    console.log('✅ 管理员 OP_GXC 初始化完成');
                    console.log('📧 邮箱: admin@example.com');
                    console.log('👤 用户名: OP_GXC');
                }
                rl.close();
                db.close();
            });

        } catch (error) {
            console.error('❌ 密码加密失败:', error);
            rl.close();
            db.close();
        }
    });
}