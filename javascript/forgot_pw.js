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
    const btnText = btn.querySelector('.btn-text');

    btn.disabled = true;
    btnText.textContent = '发送中...';

    try {
        const res = await fetch("/api/send-verification-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, type: "forgot-password" })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || '发送验证码失败');
        }

        alert('验证码已发送到您的邮箱，请查收');

        // 显示第二步
        document.getElementById('step1').classList.add('hidden');
        document.getElementById('step2').classList.remove('hidden');

        // 开始倒计时
        let countdown = 60;
        const timer = setInterval(() => {
            btnText.textContent = `重新发送(${countdown})`;
            countdown--;

            if (countdown < 0) {
                clearInterval(timer);
                btn.disabled = false;
                btnText.textContent = '重新发送验证码';
            }
        }, 1000);

    } catch (error) {
        btn.disabled = false;
        btnText.textContent = '发送验证码';
        alert(error.message);
    }
});

document.getElementById('forgotPasswordForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const code = document.getElementById('verification-code').value;
    const newPassword = document.getElementById('new-password').value;
    const submitBtn = document.querySelector('#step2 .submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');

    // 显示加载状态
    submitBtn.classList.add('loading');
    btnText.textContent = '重置中...';

    try {
        const res = await fetch("/api/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code, newPassword })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || '重置密码失败');
        }

        // 重置成功
        btnText.textContent = '重置成功！';
        setTimeout(() => {
            alert("密码重置成功，请使用新密码登录");
            location.href = "login.html";
        }, 1000);

    } catch (error) {
        // 恢复按钮状态
        submitBtn.classList.remove('loading');
        btnText.textContent = '重置密码';
        alert(error.message);
    }
});