# 🚀 Hệ thống Chat Phân Tán với Redis & Docker

## 📋 Tổng quan

Hệ thống chat real-time được thiết kế để scale horizontally với:

- ✅ **3 Backend instances** chạy song song
- ✅ **Redis Adapter** để đồng bộ Socket.IO
- ✅ **Nginx Load Balancer** phân phối traffic
- ✅ **MongoDB** lưu trữ dữ liệu
- ✅ **Docker Compose** orchestration

## 🎯 Tính năng chính

### Đã triển khai:

- [x] Đăng ký / Đăng nhập với JWT
- [x] Chat 1-1 và nhóm
- [x] Real-time messaging
- [x] Online/Offline status
- [x] Seen status
- [x] Load balancing
- [x] Redis clustering
- [x] Docker containerization

### Sắp triển khai:

- [ ] File upload (images, documents)
- [ ] Voice/Video calls
- [ ] Message reactions
- [ ] Message search
- [ ] Push notifications

## 🏗️ Kiến trúc

```
┌──────────┐
│  Client  │
└─────┬────┘
      │
      ▼
┌─────────────┐
│ Nginx LB    │ ← Load balancer với WebSocket support
│   :3000     │
└──────┬──────┘
       │
   ┌───┴───┬────────┬────────┐
   ▼       ▼        ▼
┌──────┐┌──────┐┌──────┐
│ BE-1 ││ BE-2 ││ BE-3 │ ← Backend instances với Socket.IO
│:3001 ││:3002 ││:3003 │
└──┬───┘└──┬───┘└──┬───┘
   └───────┴────────┘
          │
    ┌─────┴──────┐
    ▼            ▼
┌────────┐  ┌─────────┐
│ Redis  │  │ MongoDB │ ← Data layer
│ :6379  │  │ :27017  │
└────────┘  └─────────┘
```

## 🚀 Quick Start

### Cách 1: Sử dụng script tự động (Khuyến nghị)

```bash
# Clone project
git clone <your-repo-url>
cd chat-app

# Chạy script deploy
./deploy.sh
```

### Cách 2: Deploy thủ công

```bash
# 1. Tạo file .env
cp .env.example .env

# 2. Cập nhật server.js với Redis
cp server-redis.js backend/server.js

# 3. Cập nhật package.json
cp package.json backend/package.json

# 4. Build và khởi động
docker-compose build
docker-compose up -d

# 5. Kiểm tra logs
docker-compose logs -f
```

## 📦 Cấu trúc thư mục

```
.
├── backend/
│   ├── controllers/
│   │   ├── chatController.js
│   │   ├── messageController.js
│   │   └── userController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── chatModel.js
│   │   ├── messageModel.js
│   │   └── userModel.js
│   ├── routes/
│   │   ├── chatRoute.js
│   │   ├── messageRoute.js
│   │   └── userRoute.js
│   ├── server.js
│   └── package.json
├── fronted/
│   ├── index.html
│   ├── register.html
│   ├── chat.html
│   ├── chat.js
│   ├── profile.html
│   └── profile.js
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf
├── nginx-lb.conf
├── deploy.sh
├── .env.example
├── .dockerignore
├── DEPLOYMENT_GUIDE.md
└── README.md
```

## 🔧 Cấu hình

### Environment Variables (.env)

```env
# Server
PORT=3000
NODE_ENV=production

# Database
ATLAS_URI=mongodb://admin:password123@mongodb:27017/chat?authSource=admin

# JWT
JWT_SECRET=your-secret-key-change-this

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123
```

### Ports

| Service       | Port  | Description         |
| ------------- | ----- | ------------------- |
| Frontend      | 8080  | Nginx web server    |
| Load Balancer | 3000  | Nginx reverse proxy |
| Backend-1     | 3001  | Node.js instance 1  |
| Backend-2     | 3002  | Node.js instance 2  |
| Backend-3     | 3003  | Node.js instance 3  |
| Redis         | 6379  | Redis server        |
| MongoDB       | 27017 | MongoDB server      |

## 🧪 Testing

### 1. Test Load Balancing

```bash
# Gửi 10 requests và quan sát instance nào xử lý
for i in {1..10}; do
  curl http://localhost:3000/health
  echo ""
done
```

### 2. Test Real-time Messaging

1. Mở 2 browsers khác nhau
2. Đăng nhập 2 tài khoản
3. Tạo chat giữa 2 users
4. Gửi message từ user 1
5. Verify user 2 nhận được real-time (dù 2 users có thể connect tới 2 backend khác nhau)

### 3. Test Failover

```bash
# Dừng 1 backend instance
docker-compose stop backend-1

# Hệ thống vẫn hoạt động
# Gửi message vẫn thành công
# Load balancer tự động chuyển sang backend-2 và backend-3

# Khởi động lại
docker-compose start backend-1
```

## 📊 Monitoring

### Xem logs

```bash
# Tất cả services
docker-compose logs -f

# Một service cụ thể
docker-compose logs -f backend-1

# 100 dòng cuối
docker-compose logs --tail=100
```

### Kiểm tra status

```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Health check
curl http://localhost:3000/health
```

### Redis monitoring

```bash
# Connect Redis CLI
docker exec -it chat-redis redis-cli -a redis123

# View stats
INFO stats

# Monitor commands
MONITOR

# View pub/sub channels
PUBSUB CHANNELS
```

### MongoDB monitoring

```bash
# Connect MongoDB
docker exec -it chat-mongodb mongosh -u admin -p password123

# View databases
show dbs

# Use chat database
use chat

# View collections
show collections

# Count documents
db.users.countDocuments()
db.messages.countDocuments()
```

## 🔄 Scaling

### Scale up (Thêm instances)

1. Thêm backend-4 vào `docker-compose.yml`
2. Cập nhật `nginx-lb.conf` để thêm upstream server
3. Restart:

```bash
docker-compose up -d backend-4
docker-compose restart nginx-lb
```

### Scale down (Giảm instances)

```bash
docker-compose stop backend-3
docker-compose rm -f backend-3
```

## 🛠️ Troubleshooting

### Backend không connect Redis

```bash
# Kiểm tra Redis
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### Socket.IO không hoạt động cross-instance

```bash
# Verify Redis connections (phải có 6 connections: 2/instance)
docker exec -it chat-redis redis-cli -a redis123
> CLIENT LIST

# Kiểm tra adapter logs
docker-compose logs backend-1 | grep -i redis
```

### Load balancer không phân phối đều

```bash
# Test nginx config
docker exec chat-nginx-lb nginx -t

# Reload nginx
docker-compose restart nginx-lb
```

## 🔒 Security

### Production checklist:

- [ ] Đổi tất cả passwords mặc định
- [ ] Sử dụng strong JWT secret
- [ ] Enable HTTPS với SSL certificate
- [ ] Restrict MongoDB/Redis access
- [ ] Set up firewall rules
- [ ] Enable Docker secrets
- [ ] Regular security updates
- [ ] Backup strategy

### Secure .env example:

```env
JWT_SECRET=$(openssl rand -hex 32)
MONGO_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
```

## 📈 Performance Tuning

### Redis optimization

```conf
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
tcp-backlog 511
```

### MongoDB indexing

```javascript
// Trong models
UserSchema.index({ email: 1 });
ChatSchema.index({ users: 1, updatedAt: -1 });
MessageSchema.index({ chat: 1, createdAt: 1 });
```

### Nginx tuning

```nginx
events {
    worker_connections 4096;
}

http {
    keepalive_timeout 65;
    keepalive_requests 100;
}
```

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Chi tiết về deployment
- [API Documentation](docs/API.md) - API endpoints
- [Socket Events](docs/SOCKET_EVENTS.md) - Socket.IO events

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Socket.IO team for amazing real-time library
- Redis team for pub/sub capabilities
- Docker team for containerization
- Nginx team for robust load balancing

---

**Made with ❤️ using Node.js, Socket.IO, Redis, and Docker**
