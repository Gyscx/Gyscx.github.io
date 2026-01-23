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
    const loginDisplay = document.querySelector('.login_display')
    // 检查登录状态
    function checkLoginStatus() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');

        if (token && username) {
            // 已登录
            usernameDisplay.textContent = username;
            userInfo.style.display = 'flex';
            loginModal.classList.remove('active');
            loginDisplay.style.display = 'none'
        } else {
            // 未登录
            userInfo.style.display = 'none';
            loginDisplay.style.display = 'inline'
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

    // 投票系统链接点击事件
    voteSystemLink.addEventListener('click', function (e) {
        e.preventDefault();

        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username'); // 添加username检查
        if (!token || !username) {
            // 未登录，保存目标页面并显示登录模态框
            localStorage.setItem('targetPage', 'http://192.168.1.10:3000/vote.html'); // 改为相对路径
            loginModal.classList.add('active');
        } else {
            // 已登录，直接跳转
            window.location.href = 'http://192.168.1.10:3000/vote.html'; // 改为相对路径
        }
    });

    // 留言板链接点击事件
    messageBoardLink.addEventListener('click', function (e) {
        e.preventDefault();

        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username'); // 添加username检查
        if (!token || !username) {
            // 未登录，保存目标页面并显示登录模态框
            localStorage.setItem('targetPage', 'message_board.html'); // 改为相对路径
            loginModal.classList.add('active');
        } else {
            // 已登录，直接跳转
            window.location.href = 'message_board.html'; // 改为相对路径
        }
    });

    // 页面加载时检查登录状态
    checkLoginStatus();

    // 检查是否有需要跳转的目标页面（例如从其他页面跳转过来需要登录）
    const urlParams = new URLSearchParams(window.location.search);
    const target = urlParams.get('target');
    const token = localStorage.getItem('token');

    if (target && !token) {
        // 有目标页面但未登录，显示登录模态框
        localStorage.setItem('targetPage', target);
        loginModal.classList.add('active');
    }
});