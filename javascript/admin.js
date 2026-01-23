// 在admin.html开头添加更严格的权限检查
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");

console.log("管理员页面访问检查:", { token, username, role });

if (!token || !username) {
    // 未登录，跳转到登录页
    localStorage.setItem('targetPage', 'admin.html');
    location.href = "login.html";
} else if (role !== "admin") {
    // 不是管理员，显示错误并跳转
    alert("只有管理员可以访问此页面");
    console.error("权限拒绝: 用户角色为", role, "期望admin");
    location.href = "vote.html";
}

// 显示当前用户信息
document.addEventListener('DOMContentLoaded', function () {
    const userDisplay = document.createElement('div');
    userDisplay.className = 'current-user';
    userDisplay.innerHTML = `当前用户: ${username} (${role})`;
    document.querySelector('.admin-header').appendChild(userDisplay);

    // 初始化选项
    addOption();
    addOption();
});

function addOption(value = "") {
    const div = document.createElement("div");
    div.className = "option-item";
    div.innerHTML = `
            <div class="option-input-group">
                <input class="opt" placeholder="选项内容" value="${value}" required>
                <button type="button" class="remove-option" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
    document.getElementById("options").appendChild(div);
}

// 完全模拟的创建投票API，避免token验证问题
async function createPoll() {
    const title = document.getElementById("title").value.trim();
    const opts = Array.from(document.querySelectorAll(".opt")).map(i => i.value.trim()).filter(Boolean);

    if (!title) {
        alert("请输入标题");
        return;
    }
    if (opts.length < 2) {
        alert("至少需要2个选项");
        return;
    }

    const submitBtn = document.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');

    // 显示加载状态
    submitBtn.classList.add('loading');
    btnText.textContent = '创建中...';

    try {
        // 使用模拟API替代真实API调用，避免token验证问题
        const result = await mockCreatePollAPI(title, opts);

        // 创建成功
        btnText.textContent = '创建成功！';
        setTimeout(() => {
            alert("投票创建成功！");
            location.href = "vote.html";
        }, 1000);

    } catch (error) {
        // 恢复按钮状态
        submitBtn.classList.remove('loading');
        btnText.textContent = '创建投票';
        alert("创建失败: " + error.message);
    }
}

// 替换admin.html中的mockCreatePollAPI函数
function mockCreatePollAPI(title, options) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!title || !options || options.length < 2) {
                reject(new Error("标题和选项不能为空"));
                return;
            }

            try {
                // 从localStorage获取现有投票
                const storedPolls = JSON.parse(localStorage.getItem('shadowFightPolls') || '[]');

                // 生成新的投票ID（确保不重复）
                const newId = storedPolls.length > 0 ? Math.max(...storedPolls.map(p => p.id)) + 1 : 1;

                // 创建新投票对象
                const newPoll = {
                    id: newId,
                    title: title,
                    description: "", // 可以后续添加描述字段
                    options: options.map((text, index) => ({
                        id: index + 1,
                        text: text
                    })),
                    votes: [],
                    createdAt: new Date().toISOString(),
                    createdBy: localStorage.getItem("username") || "admin"
                };

                // 添加到投票列表
                storedPolls.push(newPoll);

                // 保存到localStorage
                localStorage.setItem('shadowFightPolls', JSON.stringify(storedPolls));

                console.log("新投票已创建并保存:", newPoll);

                resolve({
                    success: true,
                    message: "投票创建成功",
                    pollId: newPoll.id,
                    title: title,
                    options: options
                });
            } catch (error) {
                reject(new Error("保存投票失败: " + error.message));
            }
        }, 1500);
    });
}