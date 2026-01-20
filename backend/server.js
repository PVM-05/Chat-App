const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const userRoute = require('./routes/userRoute');
const chatRoute = require('./routes/chatRoute');
const messageRoute = require('./routes/messageRoute');

const app = express();
require('dotenv').config();

app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000;
const uri = process.env.ATLAS_URI;

// ==========================================
// Health Check Endpoint
// ==========================================
app.get('/health', (req, res) => {
  const instanceName = process.env.INSTANCE_NAME || process.env.HOSTNAME || 'unknown';
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    instance: instanceName,
    container: process.env.HOSTNAME
  });
});

// ==========================================
// Routes
// ==========================================
app.use('/api/users', userRoute);
app.use('/api/chats', chatRoute);
app.use('/api/messages', messageRoute);

// ==========================================
// Kết nối MongoDB
// ==========================================
mongoose.connect(uri)
  .then(() => console.log(" Kết nối MongoDB thành công"))
  .catch(err => console.error(" Lỗi kết nối MongoDB:", err.message));

// ==========================================
// Khởi tạo Server & Socket.IO
// ==========================================
const server = app.listen(port, () => {
  console.log(` Server đang chạy tại cổng ${port}`);
  console.log(` Instance: ${process.env.HOSTNAME || 'local'}`);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
});

// ==========================================
// Cấu hình Redis Adapter
// ==========================================
async function setupRedisAdapter() {
  try {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || 6379;
    const redisPassword = process.env.REDIS_PASSWORD;

    console.log(` Đang kết nối tới Redis: ${redisHost}:${redisPort}`);

    // Tạo 2 Redis clients: một cho publish, một cho subscribe
    const pubClient = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
      },
      password: redisPassword,
    });

    const subClient = pubClient.duplicate();

    // Xử lý lỗi
    pubClient.on('error', (err) => console.error('Redis Pub Client lỗi:', err));
    subClient.on('error', (err) => console.error('Redis Sub Client lỗi:', err));

    // Kết nối
    await Promise.all([
      pubClient.connect(),
      subClient.connect()
    ]);

    console.log('Redis Adapter đã kết nối thành công');

    // Gắn adapter vào Socket.IO
    io.adapter(createAdapter(pubClient, subClient));

    // Lắng nghe sự kiện từ Redis để debug
    io.of("/").adapter.on("create-room", (room) => {
      console.log(` Tạo phòng: ${room}`);
    });

    io.of("/").adapter.on("join-room", (room, id) => {
      console.log(` Socket ${id} vào phòng ${room}`);
    });

    io.of("/").adapter.on("leave-room", (room, id) => {
      console.log(`Socket ${id} rời phòng ${room}`);
    });

  } catch (error) {
    console.error('Lỗi khi thiết lập Redis Adapter:', error);
    process.exit(1);
  }
}

// Khởi tạo Redis adapter
setupRedisAdapter();

// ==========================================
// Socket.IO Event Handlers
// ==========================================

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`🔌 Socket.io connected: ${socket.id}`);

  // ==========================================
  // Setup user 
  // ==========================================
  socket.on("setup", async (userData) => {
    socket.userId = userData._id;
    socket.join(userData._id);
    
    // Thêm socket vào danh sách user connections
    if (!onlineUsers.has(userData._id)) {
      onlineUsers.set(userData._id, new Set());
      // Chỉ broadcast khi user thực sự online lần đầu
      socket.broadcast.emit("user online", userData._id);
    }
    onlineUsers.get(userData._id).add(socket.id);
    
    // Gửi danh sách tất cả users đang online
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("online users", onlineUserIds);
    
    socket.emit("connected");
    
    console.log(`User ${userData.username} (${userData._id}) đã kết nối - Tổng kết nối: ${onlineUsers.get(userData._id).size}`);
  });

  // ==========================================
  // Disconnect
  // ==========================================
  socket.on("disconnect", async () => {
    if (socket.userId) {
      const userSockets = onlineUsers.get(socket.userId);
      
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // Chỉ broadcast offline khi user không còn connection nào
        if (userSockets.size === 0) {
          onlineUsers.delete(socket.userId);
          socket.broadcast.emit("user offline", socket.userId);
          console.log(` User ${socket.userId} đã ngắt kết nối`);
        } else {
          console.log(` User ${socket.userId} vẫn có ${userSockets.size} kết nối`);
        }
      }
    }
  });

  // ==========================================
  // Join chat room
  // ==========================================
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log(`👥 User joined chat room: ${room}`);
  });

  // ==========================================
  // Leave chat room
  // ==========================================
  socket.on("leave chat", (room) => {
    socket.leave(room);
    console.log(`🚪 User left chat room: ${room}`);
  });

  // ==========================================
  // New message
  // ==========================================
  socket.on("new message", (newMessageReceived) => {
    const chat = newMessageReceived.chat;
    
    if (!chat.users) {
      return console.log(" chat.users không tồn tại");
    }

    console.log(`💬 New message in chat ${chat._id}`);

    chat.users.forEach((user) => {
      if (String(user._id) === String(newMessageReceived.sender._id)) return;
      
      socket.in(String(user._id)).emit("message received", newMessageReceived);
      
      socket.in(user._id).emit("chat updated", {
        chatId: chat._id,
        latestMessage: newMessageReceived,
        updatedAt: newMessageReceived.createdAt
      });
    });
  });

  // ==========================================
  // Typing indicator
  // ==========================================
  socket.on("typing", (room) => {
    socket.in(room).emit("typing");
  });

  socket.on("stop typing", (room) => {
    socket.in(room).emit("stop typing");
  });
});

// ==========================================
// Graceful Shutdown
// ==========================================
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log(' HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log(' MongoDB connection closed');
      process.exit(0);
    });
  });
});