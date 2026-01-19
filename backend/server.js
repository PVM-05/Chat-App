const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoute = require('./routes/userRoute');
const chatRoute = require('./routes/chatRoute');
const messageRoute = require('./routes/messageRoute');
const onlineUsers = new Set();

const app = express();
require('dotenv').config();

app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000;
const uri = process.env.ATLAS_URI;

// Routes
app.use('/api/users', userRoute);
app.use('/api/chats', chatRoute);
app.use('/api/messages', messageRoute);

// Kết nối DB
mongoose.connect(uri)
  .then(() => console.log("Kết nối MongoDB thành công"))
  .catch(err => console.error("Lỗi kết nối MongoDB:", err.message));

// Khởi tạo Server & Socket.io
const server = app.listen(port, () => {
  console.log(`Server đang chạy tại cổng ${port}`);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*", // Cho phép mọi kết nối frontend (để test cho dễ)
  },
});

io.on("connection", (socket) => {
  console.log("Socket.io đã kết nối");

  // Setup user
  socket.on("setup", (userData) => {
    socket.userId = userData._id;
    socket.join(userData._id);
    onlineUsers.add(userData._id);
    socket.broadcast.emit("user online", userData._id);
    socket.emit("connected");
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit("user offline", socket.userId);
    }
  });

  // Join phòng chat
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User đã vào phòng: " + room);
  });
  socket.on("leave chat", (room) => socket.leave(room));

  // Gửi tin nhắn mới
  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;
    if (!chat.users) return console.log("chat.users không tồn tại");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return; // Không gửi lại cho chính mình
      socket.in(user._id).emit("message received", newMessageRecieved);
      // Emit thông tin chat đã cập nhật để frontend cập nhật sidebar
      socket.in(user._id).emit("chat updated", {
        chatId: chat._id,
        latestMessage: newMessageRecieved,
        updatedAt: newMessageRecieved.createdAt
      });
    });
  });
});