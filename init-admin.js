// init-admin.js - 修复版管理员初始化脚本
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

// 添加密码确认函数
function confirmPassword() {
    return new Promise((resolve) => {
        rl.question('请输入管理员 OP_GXC 的新密码: ', (password1) => {
            // 检查密码是否为空
            if (!password1 || password1.trim() === '') {
                console.log('❌ 密码不能为空，请重新输入');
                confirmPassword().then(resolve);
                return;
            }

            rl.question('请再次输入密码进行确认: ', (password2) => {
                if (password1 !== password2) {
                    console.log('❌ 两次输入的密码不一致，请重新输入');
                    confirmPassword().then(resolve);
                } else {
                    console.log('✅ 密码确认成功');
                    resolve(password1);
                }
            });
        });
    });
}

async function initAdmin() {
    try {
        // 获取确认后的密码
        const password = await confirmPassword();

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
                console.log('🔑 密码: ' + '*'.repeat(password.length));
                console.log('👑 角色: admin');
            }
            rl.close();
            db.close();
        });
        // 插入或更新管理员账户，确保role为admin
        await new Promise((resolve, reject) => {
            db.run(`
                INSERT OR REPLACE INTO users (username, password_hash, role, email) 
                VALUES (?, ?, 'admin', ?)  -- ✅ 明确设置role为admin
            `, ['OP_GXC', hashedPassword, 'admin@example.com'], function (err) {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ 管理员账户已创建/更新');

                    // 验证角色设置
                    db.get('SELECT username, role FROM users WHERE username = ?', ['OP_GXC'], (err, row) => {
                        if (err) {
                            console.error('❌ 角色验证失败:', err);
                        } else {
                            console.log('✅ 角色验证成功:', row);
                        }
                        resolve();
                    });
                }
            });
        });
    } catch (error) {
        console.error('❌ 初始化失败:', error);
    }
}