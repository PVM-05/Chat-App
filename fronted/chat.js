const BASE_URL = "http://localhost:3000/api";
const token = localStorage.getItem("token");
const currentUser = JSON.parse(localStorage.getItem("user"));
let selectedChatId = null;

// Kết nối Socket.io
const socket = io("http://localhost:3000");

// 1. Kiểm tra Auth & Setup Socket
if (!token || !currentUser) {
    window.location.href = "index.html";
} else {
    document.getElementById("myName").innerText = currentUser.username;
    
    socket.emit("setup", currentUser);
    
    // Lắng nghe tin nhắn mới Realtime
    socket.on("message received", (newMessage) => {
        if (selectedChatId === newMessage.chat._id) {
            renderIncomingMessage(newMessage);
        } else {
            // Có thể thêm thông báo tin nhắn mới ở sidebar tại đây
            loadChats(); // Reload sidebar để cập nhật tin nhắn mới nhất
        }
    });
}

// 2. Load Danh sách Chat
loadChats();

async function loadChats() {
    try {
        const res = await fetch(`${BASE_URL}/chats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const chats = await res.json();
        const list = document.getElementById("chatList");
        list.innerHTML = "";

        chats.forEach(chat => {
            const friend = chat.users.find(u => u._id !== currentUser._id);
            const isActive = chat._id === selectedChatId;
            const div = document.createElement("div");
            
            div.className = `flex items-center p-3 rounded-lg cursor-pointer transition hover:bg-gray-100 ${isActive ? 'bg-blue-50' : ''}`;
            div.onclick = () => selectChat(chat._id, friend);
            
            // Avatar random theo tên
            const avatarUrl = `https://ui-avatars.com/api/?name=${friend.username}&background=random`;

            div.innerHTML = `
                <div class="relative">
                    <img src="${avatarUrl}" class="w-12 h-12 rounded-full object-cover">
                    <span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                <div class="ml-3 flex-1 overflow-hidden">
                    <h3 class="font-semibold text-gray-900 truncate">${friend.username}</h3>
                    <p class="text-sm text-gray-500 truncate font-light">
                        ${chat.latestMessage ? chat.latestMessage.content : "Bắt đầu trò chuyện"}
                    </p>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (err) { console.error(err); }
}

// 3. Chọn Chat
async function selectChat(chatId, friend) {
    selectedChatId = chatId;
    socket.emit("join chat", chatId); // Join phòng socket

    // UI Update
    document.getElementById("welcomeScreen").classList.add("hidden");
    document.getElementById("activeChat").classList.remove("hidden");
    document.getElementById("activeChat").classList.add("flex");
    
    document.getElementById("headerName").innerText = friend.username;
    document.getElementById("headerAvatar").innerHTML = `<img src="https://ui-avatars.com/api/?name=${friend.username}&background=random" class="w-full h-full rounded-full">`;
    
    loadChats(); // Highlight item đang chọn

    // Load Messages
    try {
        const res = await fetch(`${BASE_URL}/messages/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const messages = await res.json();
        renderMessages(messages);
    } catch (err) { console.error(err); }
}

// 4. Render Tin nhắn (Lịch sử)
function renderMessages(messages) {
    const container = document.getElementById("messagesContainer");
    container.innerHTML = "";
    messages.forEach(msg => {
        const isMe = msg.sender._id === currentUser._id;
        appendMessageToUI(msg, isMe);
    });
    container.scrollTop = container.scrollHeight;
}

// 5. Render 1 tin nhắn lên UI
function appendMessageToUI(msg, isMe) {
    const container = document.getElementById("messagesContainer");
    const div = document.createElement("div");
    
    if (isMe) {
        div.className = "flex justify-end mb-2";
        div.innerHTML = `
            <div class="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-none max-w-[70%] text-sm shadow-sm">
                ${msg.content}
            </div>`;
    } else {
        div.className = "flex items-end mb-2";
        div.innerHTML = `
            <div class="w-8 h-8 rounded-full mr-2 overflow-hidden">
                 <img src="https://ui-avatars.com/api/?name=${msg.sender.username}&background=random">
            </div>
            <div class="bg-gray-200 text-gray-900 px-4 py-2 rounded-2xl rounded-bl-none max-w-[70%] text-sm">
                ${msg.content}
            </div>`;
    }
    container.appendChild(div);
}

// 6. Xử lý tin nhắn Realtime nhận được
function renderIncomingMessage(msg) {
    appendMessageToUI(msg, false); // false vì là người khác gửi
    const container = document.getElementById("messagesContainer");
    container.scrollTop = container.scrollHeight;
}

// 7. Gửi tin nhắn
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
            body: JSON.stringify({ content: content, chatId: selectedChatId })
        });
        const newMsg = await res.json();
        if (res.ok) {
            input.value = "";
            socket.emit("new message", newMsg); // Gửi socket cho người kia
            appendMessageToUI(newMsg, true); // Hiện lên máy mình
            
            // Cuộn xuống
            const container = document.getElementById("messagesContainer");
            container.scrollTop = container.scrollHeight;
        }
    } catch (err) { alert("Lỗi gửi tin"); }
}

function handleEnter(e) { if (e.key === 'Enter') sendMessage(); }

// 8. Tạo Chat Mới
async function createNewChat() {
    const userId = document.getElementById("newChatId").value;
    if(!userId) return alert("Nhập ID người dùng!");
    try {
        const res = await fetch(`${BASE_URL}/chats`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userId })
        });
        if(res.ok) { loadChats(); alert("Đã thêm!"); }
        else alert("Lỗi");
    } catch(err) { console.error(err); }
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}