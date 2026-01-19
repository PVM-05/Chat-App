const BASE_URL = "http://localhost:3000/api/users";

/* ========== ĐĂNG KÝ ========== */
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;

        try {
            const res = await fetch(`${BASE_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                document.getElementById("registerMessage").innerText = data;
                return;
            }

            alert("Đăng ký thành công!");
            window.location.href = "index.html";

        } catch (err) {
            console.error(err);
        }
    });
}

/* ========== ĐĂNG NHẬP ========== */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const res = await fetch(`${BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                document.getElementById("loginMessage").innerText = data;
                return;
            }

            // Lưu token
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data));

            alert("Đăng nhập thành công!");
            window.location.href = "chat.html";

        } catch (err) {
            console.error(err);
        }
    });
}
