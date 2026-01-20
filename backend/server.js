// ==========================
// IMPORTS
// ==========================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Server } = require('socket.io');

// Routes
const userRoute = require('./routes/userRoute');
const chatRoute = require('./routes/chatRoute');
const messageRoute = require('./routes/messageRoute');

// ==========================
// APP SETUP
// ==========================
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.ATLAS_URI;

// ==========================
// HEALTH CHECK
// ==========================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    instance: process.env.HOSTNAME || 'local',
    timestamp: new Date().toISOString()
  });
});

// ==========================
// ROUTES
// ==========================
app.use('/api/users', userRoute);
app.use('/api/chats', chatRoute);
app.use('/api/messages', messageRoute);

// ==========================
// DATABASE
// ==========================
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });

// ==========================
// SERVER
// ==========================
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Instance: ${process.env.HOSTNAME || 'local'}`);
});

// ==========================
// SOCKET.IO
// ==========================
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ==========================
// SOCKET AUTH (JWT)
// ==========================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// ==========================
// REDIS ADAPTER
// ==========================
async function setupRedis() {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = process.env.REDIS_PORT || 6379;
  const redisPassword = process.env.REDIS_PASSWORD;

  console.log(`🔌 Connecting Redis ${redisHost}:${redisPort}`);

  const pubClient = createClient({
    socket: { host: redisHost, port: redisPort },
    password: redisPassword
  });

  const subClient = pubClient.duplicate();

  pubClient.on('error', err => console.error('❌ Redis Pub Error:', err));
  subClient.on('error', err => console.error('❌ Redis Sub Error:', err));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));
  console.log('✅ Redis Adapter ready');
}

setupRedis().catch(err => {
  console.error('❌ Redis setup failed:', err);
  process.exit(1);
});

// ==========================
// SOCKET EVENTS
// ==========================
io.on('connection', (socket) => {
  const userId = socket.user.id;

  console.log(`🔌 Socket connected: ${socket.id} | User: ${userId}`);

  // Join personal room
  socket.join(userId);
  socket.broadcast.emit('user online', userId);

  socket.emit('connected');

  // Join chat room
  socket.on('join chat', (chatId) => {
    socket.join(chatId);
    console.log(`👥 User ${userId} joined chat ${chatId}`);
  });

  // Leave chat room
  socket.on('leave chat', (chatId) => {
    socket.leave(chatId);
    console.log(`🚪 User ${userId} left chat ${chatId}`);
  });

  // New message
  socket.on('new message', (message) => {
    if (!message?.chat?.users) return;

    message.chat.users.forEach(user => {
      if (user._id === userId) return;

      socket.to(user._id).emit('message received', message);
      socket.to(user._id).emit('chat updated', {
        chatId: message.chat._id,
        latestMessage: message,
        updatedAt: message.createdAt
      });
    });
  });

  // Typing
  socket.on('typing', (chatId) => {
    socket.to(chatId).emit('typing');
  });

  socket.on('stop typing', (chatId) => {
    socket.to(chatId).emit('stop typing');
  });

  // Disconnect
  socket.on('disconnect', () => {
    socket.broadcast.emit('user offline', userId);
    console.log(`User disconnected: ${userId}`);
  });
});

// ==========================
// GRACEFUL SHUTDOWN
// ==========================
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('✅ Server & MongoDB closed');
      process.exit(0);
    });
  });
});
