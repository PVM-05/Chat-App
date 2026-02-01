const BASE_URL = "http://localhost:3000/api";
const token = sessionStorage.getItem("token");

if (!token) location.href = "index.html";

// ✅ THÊM: Load profile khi trang được tải
async function loadProfile() {
  try {
    const res = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Không thể tải thông tin");

    const user = await res.json();

    document.getElementById("username").value = user.username;
    document.getElementById("email").value = user.email;
    
    // ✅ THÊM: Hiển thị avatar hiện tại
    if (user.avatar) {
      document.getElementById("preview").src = user.avatar;
    }
  } catch (error) {
    console.error("Load profile error:", error);
    alert("Có lỗi khi tải thông tin");
  }
}

// ✅ SỬA: Preview ảnh khi chọn file - đã có sẵn trong HTML
document.getElementById('profilePic').addEventListener('change', function(event) {
  if (event.target.files && event.target.files[0]) {
    const file = event.target.files[0];
    
    // ✅ THÊM: Kiểm tra kích thước file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 5MB");
      return;
    }
    
    // ✅ THÊM: Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      alert("Vui lòng chọn file ảnh!");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview').src = e.target.result;
    }
    reader.readAsDataURL(file);
  }
});

// ✅ SỬA: Xử lý upload avatar
async function saveProfile() {
  try {
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const fileInput = document.getElementById('profilePic');
    
    // Chuẩn bị dữ liệu
    const updateData = { username, email };
    
    // ✅ THÊM: Nếu có chọn ảnh mới, convert sang base64
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      
      // Convert file to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      updateData.avatar = base64;
    }
    
    // Gửi request
    const res = await fetch(`${BASE_URL}/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(typeof data === 'string' ? data : JSON.stringify(data));
      return;
    }

    // ✅ THÊM: Update sessionStorage với thông tin mới
    const current = JSON.parse(sessionStorage.getItem("user"));
    sessionStorage.setItem("user", JSON.stringify({ 
      ...current, 
      ...data 
    }));

    alert("Cập nhật thành công!");
    
    // ✅ THÊM: Clear file input
    fileInput.value = '';
    
  } catch (error) {
    console.error("Save profile error:", error);
    alert("Có lỗi khi lưu thay đổi: " + error.message);
  }
}

// Load profile khi trang được tải
loadProfile();