// Kiểm tra token khi vừa vào trang
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

if (!token || !user) {
    alert("Bạn chưa đăng nhập!");
    window.location.href = "index.html"; // Đá về trang login
}

// Hiển thị tên người dùng
document.getElementById("currentUsername").innerText = user.username;

// Hàm Đăng xuất
function logout() {
    if(confirm("Bạn có chắc muốn đăng xuất?")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "index.html";
    }
}