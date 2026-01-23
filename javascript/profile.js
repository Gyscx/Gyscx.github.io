document.addEventListener('DOMContentLoaded', function () {
    // DOM元素
    const loginModal = document.getElementById('loginModal');
    const userInfo = document.getElementById('userInfo');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const performLogin = document.getElementById('performLogin');
    const goToRegister = document.getElementById('goToRegister');
    const voteSystemLink = document.getElementById('voteSystemLink');
    const messageBoardLink = document.getElementById('messageBoardLink');

    const loginDisplay = document.getElementById('loginDisplay');

    // 检查登录状态
    function checkLoginStatus() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');

        if (token && username) {
            // 已登录
            usernameDisplay.textContent = username;
            userInfo.style.display = 'flex';
            loginModal.style.display = 'none';
            loginDisplay.style.display = 'none';
        } else {
            // 未登录
            userInfo.style.display = 'none';
            loginDisplay.style.display = 'inline';
        }
    }

    // 模拟登录函数
    function login(username, password) {
        // 模拟API调用
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // 简单验证 - 实际项目中应调用真实API
                if (username && password) {
                    resolve({
                        token: 'mock_token_' + Date.now(),
                        username: username,
                        role: 'user'
                    });
                } else {
                    reject(new Error('用户名或密码不能为空'));
                }
            }, 1000);
        });
    }

    // 登录按钮点击事件
    performLogin.addEventListener('click', async function () {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            alert('请输入用户名和密码');
            return;
        }

        // 显示加载状态
        performLogin.textContent = '登录中...';
        performLogin.disabled = true;

        try {
            const result = await login(username, password);

            // 保存登录信息
            localStorage.setItem('token', result.token);
            localStorage.setItem('username', result.username);
            localStorage.setItem('role', result.role);

            // 更新UI
            checkLoginStatus();

            // 获取目标页面并跳转
            const targetPage = localStorage.getItem('targetPage');
            if (targetPage) {
                // 清除存储的目标页面
                localStorage.removeItem('targetPage');
                window.location.href = targetPage;
            } else {
                // 默认跳转到首页
                window.location.href = 'index.html';
            }
        } catch (error) {
            alert('登录失败: ' + error.message);
            performLogin.textContent = '登录';
            performLogin.disabled = false;
        }
    });

    // 注册按钮点击事件
    goToRegister.addEventListener('click', function () {
        window.location.href = 'register.html';
    });

    // 退出登录
    logoutBtn.addEventListener('click', function () {
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('role');
            checkLoginStatus();
        }
    });

    // 页面加载时检查登录状态
    checkLoginStatus();

});