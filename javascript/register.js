document.getElementById('sendCodeBtn').addEventListener('click', async function () {
    const email = document.getElementById('email').value;
    if (!email) {
        alert('请输入邮箱地址');
        return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('请输入有效的邮箱地址');
        return;
    }

    const btn = document.getElementById('sendCodeBtn');
    btn.disabled = true;
    btn.textContent = '发送中...';

    try {
        const res = await fetch("/api/send-verification-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, type: "register" })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || '发送验证码失败');
        }

        alert('验证码已发送到您的邮箱，请查收');

        // 开始倒计时
        let countdown = 60;
        const timer = setInterval(() => {
            btn.textContent = `重新发送(${countdown})`;
            countdown--;

            if (countdown < 0) {
                clearInterval(timer);
                btn.disabled = false;
                btn.textContent = '发送验证码';
            }
        }, 1000);

    } catch (error) {
        btn.disabled = false;
        btn.textContent = '发送验证码';
        alert(error.message);
    }
});

document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const code = document.getElementById('verification-code').value;
    const submitBtn = document.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');

    // 显示加载状态
    submitBtn.classList.add('loading');
    btnText.textContent = '注册中...';

    try {
        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password, code })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || '注册失败');
        }

        // 注册成功
        btnText.textContent = '注册成功！';
        setTimeout(() => {
            alert("注册成功，请登录");
            location.href = "login.html";
        }, 1000);

    } catch (error) {
        // 恢复按钮状态
        submitBtn.classList.remove('loading');
        btnText.textContent = '注册账户';
        alert(error.message);
    }
});