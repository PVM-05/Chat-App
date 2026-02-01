const BASE_URL = "http://localhost:3000/api";
const token = sessionStorage.getItem("token");
const currentUser = JSON.parse(sessionStorage.getItem("user"));
let currentChats = [];
const onlineUsers = new Set();
let selectedChatId = null;
let currentRoom = null;
let typingTimeout = null;
let allUsers = []; 

// Socket.IO Connection
const socket = io("http://localhost:3000", {
  forceNew: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling']
});

/*INITIALIZATION */
if (!token || !currentUser) {
  location.href = "index.html";
}

socket.emit("setup", currentUser);

/* DARK MODE*/
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  sessionStorage.setItem('darkMode', isDark ? 'dark' : 'light');
  
  const icon = document.getElementById('darkModeIcon');
  icon.className = isDark ? 'fas fa-sun text-yellow-400' : 'fas fa-moon text-gray-600';
}

//
if (sessionStorage.getItem('darkMode') === 'dark') {
  document.documentElement.classList.add('dark');
  document.getElementById('darkModeIcon').className = 'fas fa-sun text-yellow-400';
}

/*SOCKET EVENTS*/
socket.on("message received", (msg) => {
  if (msg.chat._id === selectedChatId) {
    renderMessage(msg);
    updateSeenStatus([msg]);
    scrollToBottom();
  } else {
    //thongbao
    showNotification('info', `Tin nhắn mới từ ${msg.sender.username}`);
  }
  updateChatInSidebar(msg);
});

socket.on("online users", (users) => {
  onlineUsers.clear();
  users.forEach(id => onlineUsers.add(id));
  updateOnlineStatus();
  updateAllChatListStatus();
});

socket.on("user online", (userId) => {
  onlineUsers.add(userId);
  updateOnlineStatus();
  updateSingleChatStatus(userId, true);
});

socket.on("user offline", (userId) => {
  onlineUsers.delete(userId);
  updateOnlineStatus();
  updateSingleChatStatus(userId, false);
});

socket.on("typing", () => {
  document.getElementById("typingIndicator").classList.remove("hidden");
});

socket.on("stop typing", () => {
  document.getElementById("typingIndicator").classList.add("hidden");
});

socket.on("disconnect", () => {
  console.log("Socket disconnected, reconnecting...");
});

socket.on("connect", () => {
  console.log("Socket reconnected");
  socket.emit("setup", currentUser);
  if (currentRoom) {
    socket.emit("join chat", currentRoom);
  }
});

/*UTILITY FUNCTIONS*/
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
  );
}

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

function scrollToBottom() {
  const container = document.getElementById("messagesContainer");
  container.scrollTop = container.scrollHeight;
}

function showNotification(type, message) {
  const toast = document.getElementById("notificationToast");
  const icon = document.getElementById("toastIcon");
  const messageEl = document.getElementById("toastMessage");

  const types = {
    success: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', icon: 'fa-check' },
    error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: 'fa-times' },
    info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: 'fa-info' }
  };

  const config = types[type] || types.info;
  icon.className = `w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`;
  icon.querySelector('i').className = `fas ${config.icon} ${config.text}`;
  messageEl.textContent = message;

  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 5000);
}

function closeToast() {
  document.getElementById("notificationToast").classList.add("hidden");
}

/*CHAT LIST FUNCTIONS*/
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
    showNotification('error', 'Có lỗi khi tải danh sách chat');
  }
}

function renderChatList(chats) {
  const list = document.getElementById("chatList");
  
  if (chats.length === 0) {
    list.innerHTML = `
      <div class="text-center py-12 text-gray-400 dark:text-gray-500">
        <i class="fas fa-comments text-5xl mb-4"></i>
        <p class="text-sm">Chưa có cuộc trò chuyện nào</p>
        <p class="text-xs mt-2">Thêm người dùng để bắt đầu chat</p>
      </div>
    `;
    return;
  }

  list.innerHTML = "";
  chats.forEach(chat => {
    const chatItem = createChatItem(chat);
    list.appendChild(chatItem);
  });
}

function createChatItem(chat) {
  const name = chat.isGroupChat
    ? chat.chatName
    : chat.users.find(u => u._id !== currentUser._id)?.username || "Unknown";

  const div = document.createElement("div");
  div.className =
    "flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover-lift";
  div.setAttribute("data-chat-id", chat._id);
  div.onclick = () => selectChat(chat._id, name);

  const timeStr = chat.latestMessage 
    ? formatTime(chat.latestMessage.createdAt)
    : "";

  let avatarColor = `bg-gradient-to-br from-${['blue', 'purple', 'pink', 'indigo', 'green'][Math.floor(Math.random() * 5)]}-400 to-${['blue', 'purple', 'pink', 'indigo', 'green'][Math.floor(Math.random() * 5)]}-600`;
  
  let onlineIndicator = "";
  let onlineStatusText = "";
  
  if (!chat.isGroupChat) {
    const friend = chat.users.find(u => u._id !== currentUser._id);
    if (friend) {
      const isOnline = onlineUsers.has(friend._id);
      if (isOnline) {
        onlineIndicator = `<div class="online-dot" data-user-id="${friend._id}"></div>`;
      }
      onlineStatusText = isOnline ? "Đang hoạt động" : "";
    }
  } else {
    const onlineCount = chat.users.filter(u => 
      u._id !== currentUser._id && onlineUsers.has(u._id)
    ).length;
    
    if (onlineCount > 0) {
      onlineStatusText = `${onlineCount} người đang online`;
    }
  }

  const latestMsg = chat.latestMessage 
    ? `<p class="text-sm text-gray-500 dark:text-gray-400 truncate">${escapeHTML(chat.latestMessage.content)}</p>`
    : `<p class="text-sm text-gray-400 dark:text-gray-500 italic">Bắt đầu trò chuyện</p>`;

  div.innerHTML = `
    <div class="relative flex-shrink-0">
      <div class="w-14 h-14 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-lg shadow-md">
        ${name.charAt(0).toUpperCase()}
      </div>
      ${onlineIndicator}
    </div>
    <div class="flex-1 overflow-hidden min-w-0">
      <div class="flex justify-between items-baseline mb-1">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate">${escapeHTML(name)}</h3>
        ${timeStr ? `<span class="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">${timeStr}</span>` : ''}
      </div>
      ${latestMsg}
      ${onlineStatusText ? `
        <p class="text-xs text-green-600 dark:text-green-400 mt-1 online-status-text" data-chat-id="${chat._id}">
          <i class="fas fa-circle text-xs"></i> ${onlineStatusText}
        </p>
      ` : ''}
    </div>
  `;

  return div;
}

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

function updateAllChatListStatus() {
  currentChats.forEach(chat => {
    if (!chat.isGroupChat) {
      const friend = chat.users.find(u => u._id !== currentUser._id);
      if (friend) {
        updateChatItemStatus(chat._id, friend._id, onlineUsers.has(friend._id));
      }
    }
  });
}

function updateSingleChatStatus(userId, isOnline) {
  const chat = currentChats.find(c => 
    !c.isGroupChat && c.users.some(u => u._id === userId)
  );
  
  if (chat) {
    updateChatItemStatus(chat._id, userId, isOnline);
  }
}

function updateChatItemStatus(chatId, userId, isOnline) {
  const chatDiv = document.querySelector(`[data-chat-id="${chatId}"]`);
  if (!chatDiv) return;
  
  const indicator = chatDiv.querySelector(`[data-user-id="${userId}"]`);
  if (indicator) {
    if (!isOnline) {
      indicator.remove();
    }
  } else if (isOnline) {
    const avatar = chatDiv.querySelector('.relative');
    if (avatar) {
      avatar.innerHTML += `<div class="online-dot" data-user-id="${userId}"></div>`;
    }
  }
}

function filterChats(query) {
  query = query.toLowerCase().trim();
  
  if (!query) {
    renderChatList(currentChats);
    return;
  }

  const filtered = currentChats.filter(chat => {
    const name = chat.isGroupChat
      ? chat.chatName
      : chat.users.find(u => u._id !== currentUser._id)?.username || "";
    
    const latestMsg = chat.latestMessage?.content || "";
    
    return name.toLowerCase().includes(query) || 
           latestMsg.toLowerCase().includes(query);
  });

  renderChatList(filtered);
}

/*SELECT CHAT*/
async function selectChat(chatId, name) {
  if (currentRoom) socket.emit("leave chat", currentRoom);
  currentRoom = chatId;
  selectedChatId = chatId;

  socket.emit("join chat", chatId);

  document.getElementById("welcomeScreen").classList.add("hidden");
  document.getElementById("activeChat").classList.remove("hidden");

  document.getElementById("headerName").innerText = name;
  
  const chat = currentChats.find(c => c._id === chatId);
  
  // Update avatar
  const avatarEl = document.getElementById("headerAvatar");
  const colors = ['blue', 'purple', 'pink', 'indigo', 'green'];
  const fromColor = colors[Math.floor(Math.random() * colors.length)];
  const toColor = colors[Math.floor(Math.random() * colors.length)];
  avatarEl.className = `w-12 h-12 rounded-full bg-gradient-to-br from-${fromColor}-400 to-${toColor}-600 flex items-center justify-center text-white font-semibold text-xl shadow-md`;
  avatarEl.textContent = name.charAt(0).toUpperCase();

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
    scrollToBottom();

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
    showNotification('error', 'Có lỗi khi tải tin nhắn');
  }
}

function updateOnlineStatus() {
  if (!selectedChatId) return;

  const chat = currentChats.find(c => c._id === selectedChatId);
  if (!chat) return;

  const statusEl = document.getElementById("onlineStatus");
  const onlineDot = document.getElementById("headerOnlineDot");
  
  if (chat.isGroupChat) {
    const onlineMembers = chat.users.filter(u => 
      u._id !== currentUser._id && onlineUsers.has(u._id)
    );
    
    onlineDot.classList.add("hidden");
    
    if (onlineMembers.length > 0) {
      statusEl.textContent = `${onlineMembers.length} thành viên đang online`;
      statusEl.className = "text-sm text-green-600 dark:text-green-400";
    } else {
      statusEl.textContent = `${chat.users.length} thành viên`;
      statusEl.className = "text-sm text-gray-500 dark:text-gray-400";
    }
  } else {
    const friend = chat.users.find(u => u._id !== currentUser._id);
    if (!friend) return;

    const isOnline = onlineUsers.has(friend._id);

    if (isOnline) {
      onlineDot.classList.remove("hidden");
      statusEl.textContent = 'Đang hoạt động';
      statusEl.className = "text-sm text-green-600 dark:text-green-400";
    } else {
      onlineDot.classList.add("hidden");
      statusEl.textContent = 'Không hoạt động';
      statusEl.className = "text-sm text-gray-500 dark:text-gray-400";
    }
  }
}

function closeMobileChat() {
  document.getElementById("activeChat").classList.add("hidden");
  document.getElementById("welcomeScreen").classList.remove("hidden");
  selectedChatId = null;
}

/*MESSAGES*/
function renderMessage(msg) {
  const isMe = msg.sender._id === currentUser._id;
  const box = document.getElementById("messagesContainer");
  const wrap = document.createElement("div");

  const time = msg.createdAt ? formatTime(msg.createdAt) : "";

  if (isMe) {
    wrap.className = "flex justify-end";
    wrap.innerHTML = `
      <div class="message-bubble">
        <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-3 rounded-2xl rounded-br-md shadow-md">
          <p class="text-sm break-words">${escapeHTML(msg.content)}</p>
        </div>
        <span class="text-xs text-gray-400 dark:text-gray-500 mt-1 block text-right">${time}</span>
      </div>
    `;
  } else {
    wrap.className = "flex items-start gap-2";
    const colors = ['blue', 'green', 'purple', 'pink'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    wrap.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-${color}-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
        ${msg.sender.username.charAt(0).toUpperCase()}
      </div>
      <div class="message-bubble">
        <div class="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-5 py-3 rounded-2xl rounded-bl-md shadow-md border border-gray-200 dark:border-gray-600">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">${escapeHTML(msg.sender.username)}</p>
          <p class="text-sm break-words">${escapeHTML(msg.content)}</p>
        </div>
        <span class="text-xs text-gray-400 dark:text-gray-500 mt-1 block">${time}</span>
      </div>
    `;
  }

  box.appendChild(wrap);
}

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
    socket.emit("stop typing", currentRoom);
    renderMessage(msg);
    updateChatInSidebar(msg);
    scrollToBottom();
  } catch (error) {
    console.error("Lỗi gửi tin nhắn:", error);
    showNotification('error', 'Có lỗi khi gửi tin nhắn');
  }
}

function handleEnter(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function handleTyping() {
  if (!currentRoom) return;
  
  socket.emit("typing", currentRoom);
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stop typing", currentRoom);
  }, 1000);
}

function updateSeenStatus(messages) {
  if (!messages.length) return;

  const lastMsg = messages[messages.length - 1];

  if (lastMsg.sender._id !== currentUser._id) {
    document.getElementById("seenStatus").classList.add("hidden");
    return;
  }

  const readBy = lastMsg.readBy || [];
  const seen = readBy.some(id => id !== currentUser._id);

  document.getElementById("seenStatus").classList.toggle("hidden", !seen);
}

/*ADD USER MODAL*/
function openAddUserModal() {
  document.getElementById("addUserModal").classList.remove("hidden");
  document.getElementById("userSearchInput").focus();
}

function closeAddUserModal() {
  document.getElementById("addUserModal").classList.add("hidden");
  document.getElementById("userSearchInput").value = "";
  document.getElementById("manualUserId").value = "";
  document.getElementById("userSearchResults").innerHTML = `
    <div class="text-center py-8 text-gray-400 dark:text-gray-500">
      <i class="fas fa-user-friends text-4xl mb-3"></i>
      <p class="text-sm">Nhập email hoặc tên để tìm kiếm người dùng</p>
    </div>
  `;
}

let searchDebounceTimer = null;

async function searchUsers(query) {
  query = query.trim();

  // Reset debounce timer mỗi lần gọi
  clearTimeout(searchDebounceTimer);

  // Nếu query rỗng hoặc < 2 ký tự → reset UI
  if (query.length < 2) {
    document.getElementById("userSearchResults").innerHTML = `
      <div class="text-center py-8 text-gray-400 dark:text-gray-500">
        <i class="fas fa-user-friends text-4xl mb-3"></i>
        <p class="text-sm">Nhập ít nhất 2 ký tự để tìm kiếm</p>
      </div>
    `;
    return;
  }

  // Debounce 400ms: chỉ gọi API sau khi user dừng gõ 400ms
  // Tránh spam request mỗi ký tự
  searchDebounceTimer = setTimeout(async () => {
    // Show loading
    document.getElementById("userSearchResults").innerHTML = `
      <div class="text-center py-8 text-gray-400 dark:text-gray-500">
        <i class="fas fa-spinner fa-spin text-4xl mb-3"></i>
        <p class="text-sm">Đang tìm kiếm...</p>
      </div>
    `;

    try {
      // Gọi API search thật — tìm trong toàn bộ database
      const res = await fetch(`${BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        showNotification('error', err.message || 'Lỗi tìm kiếm');
        return;
      }

      const users = await res.json();
      displaySearchResults(users);

    } catch (error) {
      console.error("Search error:", error);
      showNotification('error', 'Có lỗi khi tìm kiếm');
    }
  }, 400);
}

function displaySearchResults(users) {
  const container = document.getElementById("userSearchResults");
  
  if (users.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400 dark:text-gray-500">
        <i class="fas fa-user-slash text-4xl mb-3"></i>
        <p class="text-sm">Không tìm thấy người dùng nào</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  users.forEach(user => {
    const div = document.createElement("div");
    div.className = "flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200";
    
    const firstLetter = (user.username && user.username.length > 0)
      ? user.username.charAt(0).toUpperCase()
      : "U";

    div.innerHTML = `
      <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
        ${escapeHTML(firstLetter)}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-gray-900 dark:text-gray-100 truncate">${escapeHTML(user.username)}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 truncate">${escapeHTML(user.email)}</p>
      </div>
      <button class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 flex-shrink-0">
        <i class="fas fa-plus mr-1"></i>Chat
      </button>
    `;
    
    div.querySelector('button').onclick = (e) => {
      e.stopPropagation();
      createChatWithUser(user._id);
    };
    
    container.appendChild(div);
  });
}

async function createChatWithUser(userId) {
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
    
    closeAddUserModal();
    showNotification('success', 'Đã tạo cuộc trò chuyện mới');
    loadChats();
  } catch (error) {
    console.error("Lỗi tạo chat:", error);
    showNotification('error', 'Có lỗi khi tạo chat mới');
  }
}

async function createChatById() {
  const userId = document.getElementById("manualUserId").value.trim();
  if (!userId) {
    showNotification('error', 'Vui lòng nhập User ID');
    return;
  }
  
  await createChatWithUser(userId);
}

/*GROUP MODAL*/
function openGroupModal() {
  document.getElementById("groupModal").classList.remove("hidden");
  document.getElementById("groupName").focus();
}

function closeGroupModal() {
  document.getElementById("groupModal").classList.add("hidden");
  document.getElementById("groupName").value = "";
  document.getElementById("groupUsers").value = "";
}

async function submitGroupChat() {
  const name = document.getElementById("groupName").value.trim();
  const usersStr = document.getElementById("groupUsers").value.trim();
  
  if (!name || !usersStr) {
    showNotification('error', 'Vui lòng điền đầy đủ thông tin');
    return;
  }
  
  const userIds = usersStr.split(",").map(id => id.trim()).filter(id => id);
  
  if (userIds.length < 2) {
    showNotification('error', 'Nhóm cần ít nhất 2 thành viên');
    return;
  }
  
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
    
    closeGroupModal();
    showNotification('success', 'Đã tạo nhóm chat thành công');
    loadChats();
  } catch (error) {
    console.error("Lỗi tạo nhóm:", error);
    showNotification('error', 'Có lỗi khi tạo nhóm chat');
  }
}

/*LOGOUT */
function logout() {
  if (confirm('Bạn có chắc muốn đăng xuất?')) {
    socket.disconnect();
    sessionStorage.clear();
    location.href = "index.html";
  }
}

/*INIT */
loadChats();
updateOnlineStatus();