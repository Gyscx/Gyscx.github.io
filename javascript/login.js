document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');

    // 显示加载状态
    submitBtn.classList.add('loading');
    btnText.textContent = '登录中...';

    try {
        // 模拟登录API调用
        const res = await mockLoginAPI(username, password);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || '登录失败');
        }

        // 关键修复：如果是OP_GXC用户，强制设置为admin角色
        const userRole = (username === 'OP_GXC') ? 'admin' : 'user';

        // 登录成功 - 保存完整的用户信息
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        localStorage.setItem("role", userRole);  // 使用正确的角色

        console.log("登录成功，角色设置:", { username, role: userRole });

        btnText.textContent = '登录成功！';

        // 获取目标页面并跳转
        const targetPage = localStorage.getItem('targetPage') || 'index.html';
        localStorage.removeItem('targetPage');

        setTimeout(() => {
            window.location.href = targetPage;
        }, 1000);

    } catch (error) {
        // 恢复按钮状态
        submitBtn.classList.remove('loading');
        btnText.textContent = '登录';
        alert('登录失败: ' + error.message);
    }
});

// 修改模拟登录API，生成更符合后端要求的token
function mockLoginAPI(username, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (username && password) {
                // 如果是管理员账户，返回admin角色
                const role = (username === 'OP_GXC') ? 'admin' : 'user';

                // 生成更符合真实API格式的token
                const mockToken = btoa(`mock_${username}_${Date.now()}`).replace(/=/g, '');

                resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        token: mockToken,
                        username: username,
                        role: role
                    })
                });
            } else {
                resolve({
                    ok: false,
                    json: () => Promise.resolve({
                        error: '用户名或密码不能为空'
                    })
                });
            }
        }, 1000);
    });
}