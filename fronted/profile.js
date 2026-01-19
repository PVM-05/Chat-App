const BASE_URL = "http://localhost:3000/api";
const token = localStorage.getItem("token");

if (!token) location.href = "index.html";

async function loadProfile() {
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const user = await res.json();

  document.getElementById("username").value = user.username;
  document.getElementById("email").value = user.email;
}

async function saveProfile() {
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();

  const res = await fetch(`${BASE_URL}/users/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ username, email })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data);
    return;
  }

  // update localStorage
  const current = JSON.parse(localStorage.getItem("user"));
  localStorage.setItem("user", JSON.stringify({ ...current, ...data }));

  alert("Cập nhật thành công!");
}

loadProfile();
