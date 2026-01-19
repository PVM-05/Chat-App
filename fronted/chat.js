const BASE_URL = "http://localhost:3000/api";
const token = localStorage.getItem("token");
const currentUser = JSON.parse(localStorage.getItem("user"));
let currentChats = [];
const onlineUsers = new Set();
let selectedChatId = null;
let currentRoom = null;

const socket = io("http://localhost:3000", {
    forceNew: true,           // ⭐ Bắt buộc tạo connection mới
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling']
  });

/* ================== SECURITY ================== */
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
  );
}

/* ================== AUTH ================== */
if (!token || !currentUser) {
  location.href = "index.html";
}

socket.emit("setup", currentUser);

/* ================== SOCKET ================== */
socket.on("message received", (msg) => {
  if (msg.chat._id === selectedChatId) {
    renderMessage(msg);
    updateSeenStatus([msg]);
  }
  
  updateChatInSidebar(msg);
});

socket.on("online users", (users) => {
  onlineUsers.clear();
  users.forEach(id => onlineUsers.add(id));
  updateOnlineStatus();
  updateAllChatListStatus(); // ✅ Cập nhật status cho tất cả chat trong sidebar
});

socket.on("user online", (userId) => {
  onlineUsers.add(userId);
  updateOnlineStatus();
  updateSingleChatStatus(userId, true); // ✅ Cập nhật status của 1 user
});

socket.on("user offline", (userId) => {
  onlineUsers.delete(userId);
  updateOnlineStatus();
  updateSingleChatStatus(userId, false); // ✅ Cập nhật status của 1 user
});

/* ================== LOAD CHATS ================== */
async function loadChats() {
  try {
    const res = await fetch(`${BASE_URL}/chats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Không thể tải danh sách chat");
    
    const chats = await res.json();
    currentChats = chats;

    renderChatList(chats);
  } catch (error) {
    console.error("Lỗi tải chat:", error);
    alert("Có lỗi khi tải danh sách chat");
  }
}

/* ================== RENDER CHAT LIST ================== */
function renderChatList(chats) {
  const list = document.getElementById("chatList");
  list.innerHTML = "";

  chats.forEach(chat => {
    const chatItem = createChatItem(chat);
    list.appendChild(chatItem);
  });
}

/* ================== ✅ CREATE CHAT ITEM ================== */
function createChatItem(chat) {
  const name = chat.isGroupChat
    ? chat.chatName
    : chat.users.find(u => u._id !== currentUser._id)?.username;

  const div = document.createElement("div");
  div.className =
    "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors";
  div.setAttribute("data-chat-id", chat._id);

  div.onclick = () => selectChat(chat._id, name);

  const timeStr = chat.latestMessage 
    ? formatTime(chat.latestMessage.createdAt)
    : "";

  // ✅ Lấy thông tin online status
  let onlineIndicator = "";
  let onlineStatusText = "";
  
  if (!chat.isGroupChat) {
    const friend = chat.users.find(u => u._id !== currentUser._id);
    if (friend) {
      const isOnline = onlineUsers.has(friend._id);
      onlineIndicator = `
        <div class="online-indicator ${isOnline ? 'online' : 'offline'}" 
             data-user-id="${friend._id}">
        </div>
      `;
      onlineStatusText = isOnline ? "Đang hoạt động" : "Ngoại tuyến";
    }
  } else {
    // ✅ Nhóm chat: hiển thị số người online
    const onlineCount = chat.users.filter(u => 
      u._id !== currentUser._id && onlineUsers.has(u._id)
    ).length;
    
    if (onlineCount > 0) {
      onlineStatusText = `${onlineCount} người đang online`;
    }
  }

  div.innerHTML = `
    <div class="relative">
      <img src="https://ui-avatars.com/api/?name=${escapeHTML(name)}&background=random"
           class="w-12 h-12 rounded-full">
      ${onlineIndicator}
    </div>
    <div class="flex-1 overflow-hidden">
      <div class="flex justify-between items-center mb-1">
        <h3 class="font-semibold truncate">${escapeHTML(name)}</h3>
        <span class="text-xs text-gray-400">${timeStr}</span>
      </div>
      <p class="text-sm text-gray-500 truncate latest-message">
        ${chat.latestMessage ? escapeHTML(chat.latestMessage.content) : "Bắt đầu trò chuyện"}
      </p>
      ${onlineStatusText ? `
        <p class="text-xs text-gray-400 truncate mt-0.5 online-status-text" 
           data-chat-id="${chat._id}">
          ${onlineStatusText}
        </p>
      ` : ''}
    </div>
  `;

  return div;
}

/* ================== ✅ UPDATE ALL CHAT STATUS ================== */
function updateAllChatListStatus() {
  currentChats.forEach(chat => {
    if (!chat.isGroupChat) {
      const friend = chat.users.find(u => u._id !== currentUser._id);
      if (friend) {
        updateChatItemStatus(chat._id, friend._id, onlineUsers.has(friend._id));
      }
    } else {
      // Cập nhật số người online trong nhóm
      const onlineCount = chat.users.filter(u => 
        u._id !== currentUser._id && onlineUsers.has(u._id)
      ).length;
      
      const chatDiv = document.querySelector(`[data-chat-id="${chat._id}"]`);
      if (chatDiv) {
        const statusText = chatDiv.querySelector('.online-status-text');
        if (statusText) {
          statusText.textContent = onlineCount > 0 
            ? `${onlineCount} người đang online` 
            : '';
        }
      }
    }
  });
}

/* ================== ✅ UPDATE SINGLE CHAT STATUS ================== */
function updateSingleChatStatus(userId, isOnline) {
  // Tìm chat có user này
  const chat = currentChats.find(c => 
    !c.isGroupChat && c.users.some(u => u._id === userId)
  );
  
  if (chat) {
    updateChatItemStatus(chat._id, userId, isOnline);
  }
  
  // Cập nhật trong group chats
  currentChats.forEach(chat => {
    if (chat.isGroupChat && chat.users.some(u => u._id === userId)) {
      const onlineCount = chat.users.filter(u => 
        u._id !== currentUser._id && onlineUsers.has(u._id)
      ).length;
      
      const chatDiv = document.querySelector(`[data-chat-id="${chat._id}"]`);
      if (chatDiv) {
        const statusText = chatDiv.querySelector('.online-status-text');
        if (statusText) {
          statusText.textContent = onlineCount > 0 
            ? `${onlineCount} người đang online` 
            : '';
        }
      }
    }
  });
}

/* ================== ✅ UPDATE CHAT ITEM STATUS ================== */
function updateChatItemStatus(chatId, userId, isOnline) {
  const chatDiv = document.querySelector(`[data-chat-id="${chatId}"]`);
  if (!chatDiv) return;
  
  const indicator = chatDiv.querySelector(`[data-user-id="${userId}"]`);
  if (indicator) {
    indicator.className = `online-indicator ${isOnline ? 'online' : 'offline'}`;
  }
  
  const statusText = chatDiv.querySelector('.online-status-text');
  if (statusText) {
    statusText.textContent = isOnline ? "Đang hoạt động" : "Ngoại tuyến";
    statusText.className = `text-xs truncate mt-0.5 online-status-text ${
      isOnline ? 'text-green-600' : 'text-gray-400'
    }`;
  }
}

/* ================== REALTIME UPDATE SIDEBAR ================== */
function updateChatInSidebar(msg) {
  const chatId = msg.chat._id;
  
  const chatIndex = currentChats.findIndex(c => c._id === chatId);
  
  if (chatIndex !== -1) {
    currentChats[chatIndex].latestMessage = msg;
    currentChats[chatIndex].updatedAt = msg.createdAt;
    
    const updatedChat = currentChats.splice(chatIndex, 1)[0];
    currentChats.unshift(updatedChat);
    
    renderChatList(currentChats);
  } else {
    loadChats();
  }
}

/* ================== SELECT CHAT ================== */
async function selectChat(chatId, name) {
  if (currentRoom) socket.emit("leave chat", currentRoom);
  currentRoom = chatId;
  selectedChatId = chatId;

  socket.emit("join chat", chatId);

  document.getElementById("welcomeScreen").classList.add("hidden");
  document.getElementById("activeChat").classList.remove("hidden");

  document.getElementById("headerName").innerText = name;
  document.getElementById("headerAvatar").innerHTML =
    `<img src="https://ui-avatars.com/api/?name=${escapeHTML(name)}&background=random"
          class="w-full h-full rounded-full">`;

  // ✅ Cập nhật online status trong header
  updateOnlineStatus();

  try {
    const res = await fetch(`${BASE_URL}/messages/${chatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Không thể tải tin nhắn");
    
    const messages = await res.json();

    const box = document.getElementById("messagesContainer");
    box.innerHTML = "";

    messages.forEach(renderMessage);
    updateSeenStatus(messages);
    box.scrollTop = box.scrollHeight;

    await fetch(`${BASE_URL}/messages/read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ chatId })
    });
  } catch (error) {
    console.error("Lỗi tải tin nhắn:", error);
    alert("Có lỗi khi tải tin nhắn");
  }
}

/* ================== RENDER MESSAGE ================== */
function renderMessage(msg) {
  const isMe = msg.sender._id === currentUser._id;
  const box = document.getElementById("messagesContainer");
  const wrap = document.createElement("div");

  const time = msg.createdAt ? formatTime(msg.createdAt) : "";

  if (isMe) {
    wrap.className = "flex justify-end";
    wrap.innerHTML = `
      <div class="flex flex-col items-end max-w-[70%]">
        <div class="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-none text-sm shadow">
          ${escapeHTML(msg.content)}
        </div>
        <span class="text-[10px] text-gray-400 mt-1">${time}</span>
      </div>
    `;
  } else {
    wrap.className = "flex items-end gap-2";
    wrap.innerHTML = `
      <img src="https://ui-avatars.com/api/?name=${escapeHTML(msg.sender.username)}&background=random"
           class="w-8 h-8 rounded-full">
      <div class="flex flex-col max-w-[70%]">
        <div class="bg-white text-gray-900 px-4 py-2 rounded-2xl rounded-bl-none text-sm shadow">
          ${escapeHTML(msg.content)}
        </div>
        <span class="text-[10px] text-gray-400 mt-1">${time}</span>
      </div>
    `;
  }

  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

/* ================== SEND MESSAGE ================== */
async function sendMessage() {
  const input = document.getElementById("messageInput");
  const content = input.value.trim();
  if (!content || !selectedChatId) return;

  try {
    const res = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ chatId: selectedChatId, content })
    });

    if (!res.ok) throw new Error("Gửi tin nhắn thất bại");

    const msg = await res.json();
    input.value = "";
    socket.emit("new message", msg);
    renderMessage(msg);
    
    updateChatInSidebar(msg);
  } catch (error) {
    console.error("Lỗi gửi tin nhắn:", error);
    alert("Có lỗi khi gửi tin nhắn");
  }
}

/* ================== ENTER ================== */
function handleEnter(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/* ================== FORMAT TIME ================== */
function formatTime(dateString) {
  if (!dateString) return "";
  
  const d = new Date(dateString);
  const now = new Date();
  
  if (d.toDateString() === now.toDateString()) {
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Hôm qua";
  }
  
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/* ================== UPDATE SEEN STATUS ================== */
function updateSeenStatus(messages) {
  if (!messages.length) return;

  const lastMsg = messages[messages.length - 1];

  if (lastMsg.sender._id !== currentUser._id) {
    document.getElementById("seenStatus").classList.add("hidden");
    return;
  }

  const readBy = lastMsg.readBy || [];
  const seen = readBy.some(id => id !== currentUser._id);

  document.getElementById("seenStatus")
    .classList.toggle("hidden", !seen);
}

/* ================== LOGOUT ================== */
function logout() {
  socket.disconnect();
  localStorage.clear();
  location.href = "index.html";
}

/* ================== ✅ UPDATE ONLINE STATUS (HEADER) ================== */
function updateOnlineStatus() {
  if (!selectedChatId) return;

  const chat = currentChats.find(c => c._id === selectedChatId);
  if (!chat) return;

  const statusEl = document.getElementById("onlineStatus");
  
  if (chat.isGroupChat) {
    // ✅ Nhóm: hiển thị danh sách người online
    const onlineMembers = chat.users.filter(u => 
      u._id !== currentUser._id && onlineUsers.has(u._id)
    );
    
    if (onlineMembers.length > 0) {
      const names = onlineMembers.slice(0, 3).map(u => u.username).join(", ");
      const more = onlineMembers.length > 3 ? ` và ${onlineMembers.length - 3} người khác` : "";
      statusEl.innerHTML = `<i class="fas fa-circle text-green-500 text-[6px] mr-1"></i>${names}${more} đang online`;
      statusEl.className = "text-xs text-green-600 font-medium";
    } else {
      statusEl.textContent = `${chat.users.length} thành viên`;
      statusEl.className = "text-xs text-gray-400";
    }
  } else {
    // ✅ Chat 1-1: hiển thị online/offline
    const friend = chat.users.find(u => u._id !== currentUser._id);
    if (!friend) return;

    const isOnline = onlineUsers.has(friend._id);

    if (isOnline) {
      statusEl.innerHTML = '<i class="fas fa-circle text-green-500 text-[6px] mr-1"></i>Đang hoạt động';
      statusEl.className = "text-xs font-medium text-green-600";
    } else {
      statusEl.innerHTML = '<i class="fas fa-circle text-gray-400 text-[6px] mr-1"></i>Ngoại tuyến';
      statusEl.className = "text-xs font-medium text-gray-400";
    }
  }
}

/* ================== CREATE NEW CHAT ================== */
async function createNewChat() {
  const userId = document.getElementById("newChatId").value.trim();
  if (!userId) return alert("Vui lòng nhập User ID");
  
  try {
    const res = await fetch(`${BASE_URL}/chats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ userId })
    });
    
    if (!res.ok) throw new Error("Không thể tạo chat");
    
    document.getElementById("addUserBox").classList.add("hidden");
    document.getElementById("newChatId").value = "";
    loadChats();
  } catch (error) {
    console.error("Lỗi tạo chat:", error);
    alert("Có lỗi khi tạo chat mới");
  }
}

/* ================== CREATE GROUP CHAT ================== */
async function submitGroupChat() {
  const name = document.getElementById("groupName").value.trim();
  const usersStr = document.getElementById("groupUsers").value.trim();
  
  if (!name || !usersStr) {
    return alert("Vui lòng điền đầy đủ thông tin");
  }
  
  const userIds = usersStr.split(",").map(id => id.trim());
  
  try {
    const res = await fetch(`${BASE_URL}/chats/group`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ 
        name, 
        users: JSON.stringify(userIds) 
      })
    });
    
    if (!res.ok) throw new Error("Không thể tạo nhóm");
    
    toggleGroupModal();
    document.getElementById("groupName").value = "";
    document.getElementById("groupUsers").value = "";
    loadChats();
  } catch (error) {
    console.error("Lỗi tạo nhóm:", error);
    alert("Có lỗi khi tạo nhóm chat");
  }
}

/* ================== TOGGLE GROUP MODAL ================== */
function toggleGroupModal() {
  document.getElementById("groupModal").classList.toggle("hidden");
}

/* ================== SOCKET RECONNECTION ================== */
socket.on("disconnect", () => {
  console.log("Mất kết nối socket, đang thử kết nối lại...");
});

socket.on("connect", () => {
  console.log("Đã kết nối lại socket");
  socket.emit("setup", currentUser);
  if (currentRoom) {
    socket.emit("join chat", currentRoom);
  }
});

/* ================== INIT ================== */
loadChats();
updateOnlineStatus();