# Docker Setup Guide - GMS API (Gym Management System)

Hướng dẫn thiết lập và chạy ứng dụng GMS API sử dụng Docker với MongoDB và Redis từ cloud.

## 📋 Yêu cầu

- Docker (phiên bản 20.10+)
- Docker Compose (phiên bản 2.0+)
- Tài khoản MongoDB Cloud (Atlas) hoặc tương tự
- Tài khoản Redis Cloud (Azure Cache, AWS ElastiCache, v.v)

## 🚀 Cách sử dụng

### 1. Chuẩn bị file `.env`

Copy file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Chỉnh sửa `.env` với thông tin cloud của bạn:

```env
# Cloud MongoDB
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/gms_db

# Cloud Redis
REDIS_HOST=your-redis-host.redis.cache.windows.net
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Các biến khác
JWT_SECRET=your-secure-jwt-secret-key
CLOUDINARY_NAME=your_cloudinary_name
...
```

### 2. Chạy ứng dụng - Mode Production

```bash
# Build và khởi động tất cả services
docker-compose up -d

# Hoặc rebuild image
docker-compose up -d --build

# Xem logs
docker-compose logs -f api

# Dừng services
docker-compose down
```

### 3. Chạy ứng dụng - Mode Development

Với các công cụ giám sát và UI cho databases:

```bash
# Khởi động môi trường development
docker-compose -f docker-compose.dev.yml up -d

# Xem logs
docker-compose -f docker-compose.dev.yml logs -f

# Dừng services
docker-compose -f docker-compose.dev.yml down
```

**Development tools có sẵn:**

- **MongoDB Express**: http://localhost:8081 (user: admin, password: admin)
- **Redis Commander**: http://localhost:8082

### 4. Kiểm tra trạng thái

```bash
# Xem danh sách containers đang chạy
docker-compose ps

# Kiểm tra logs của từng service
docker-compose logs mongodb
docker-compose logs redis
docker-compose logs api

# Kiểm tra health status
docker-compose ps
```

### 5. Truy cập API

- **API URL**: http://localhost:3000
- **Socket Status**: http://localhost:3000/v1/socket/status

## 📁 Cấu trúc Files

```
├── Dockerfile              # Image cho Node.js API
├── docker-compose.yml      # Production setup (MongoDB + Redis + API)
├── docker-compose.dev.yml  # Development setup (+ Mongo Express + Redis Commander)
├── .dockerignore          # Files để ignore khi build Docker
├── .env.example           # Template cho environment variables
└── DOCKER_SETUP.md        # File hướng dẫn này
```

## 🔧 Các lệnh hữu ích

### Build riêng image

```bash
# Build Docker image
docker build -t gms-api:latest .

# Build với custom tag
docker build -t gms-api:v1.0.0 .
```

### Chạy container riêng

```bash
# Chạy API container (cần MongoDB và Redis đang chạy)
docker run -d \
  --name gms-api \
  -p 3000:3000 \
  --env-file .env \
  --network gms-network \
  gms-api:latest

# Chạy với volume mounting (hot reload)
docker run -d \
  --name gms-api \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/src:/app/src \
  gms-api:latest
```

### Database operations

```bash
# Kết nối MongoDB từ CLI
docker-compose exec mongodb mongosh -u root -p password

# Kết nối Redis từ CLI
docker-compose exec redis redis-cli -a redis_password

# Xem logs MongoDB
docker-compose logs mongodb

# Xem logs Redis
docker-compose logs redis
```

### Cleanup

```bash
# Xóa containers, networks nhưng giữ volumes
docker-compose down

# Xóa tất cả bao gồm cả volumes
docker-compose down -v

# Xóa unused images
docker image prune -a

# Xóa unused volumes
docker volume prune
```

## 📊 Dung lượng dữ liệu

### Volumes tạo ra:

- `mongodb_data`: Lưu trữ database MongoDB
- `mongodb_config`: Cấu hình MongoDB
- `redis_data`: Lưu trữ cache Redis

Tất cả volumes nằm trong `/var/lib/docker/volumes/` (Linux/Mac) hoặc Docker Desktop data folder.

## 🛡️ Bảo mật

### Thay đổi mật khẩu mặc định

Trong `.env`:

```env
MONGO_ROOT_PASSWORD=your-strong-password
REDIS_PASSWORD=your-strong-password
JWT_SECRET=your-secure-jwt-key
```

### Kiểm tra port

Đảm bảo các port không bị sử dụng:

```bash
# Linux/Mac
lsof -i :3000
lsof -i :27017
lsof -i :6379

# Windows (PowerShell)
netstat -ano | findstr :3000
netstat -ano | findstr :27017
netstat -ano | findstr :6379
```

## 🐛 Troubleshooting

### Port đã bị sử dụng

```bash
# Thay đổi port trong docker-compose.yml hoặc .env
API_PORT=3001
MONGO_PORT=27018
REDIS_PORT=6380
```

### Container không khởi động được

```bash
# Xem chi tiết error
docker-compose logs api

# Rebuild image
docker-compose build --no-cache
docker-compose up -d
```

### Lỗi kết nối MongoDB

```bash
# Kiểm tra MongoDB health
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Restart MongoDB
docker-compose restart mongodb
```

### Lỗi kết nối Redis

```bash
# Kiểm tra Redis
docker-compose exec redis redis-cli -a redis_password ping

# Restart Redis
docker-compose restart redis
```

### Xóa data để reset

```bash
# Dừng services
docker-compose down

# Xóa volumes
docker volume rm gms-mongodb gms-redis

# Khởi động lại
docker-compose up -d
```

## 📈 Performance Tuning

### Tăng memory limit cho containers

Trong `docker-compose.yml`:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### MongoDB optimization

```yaml
mongodb:
  command: >
    --wiredTigerCacheSizeGB=1
    --wiredTigerJournalCompressor=snappy
```

## 🚢 Deployment

### Production checklist

- [ ] Đổi tất cả biến bảo mật trong `.env`
- [ ] Thiết lập backup cho MongoDB
- [ ] Bật SSL/TLS certificates
- [ ] Cấu hình logging và monitoring
- [ ] Thiết lập reverse proxy (Nginx/HAProxy)
- [ ] Cấu hình resource limits
- [ ] Thiết lập restart policies

### Backup MongoDB

```bash
# Tạo backup
docker-compose exec mongodb mongodump --out /data/backup --username root --password password --authenticationDatabase admin

# Restore từ backup
docker-compose exec mongodb mongorestore /data/backup --username root --password password --authenticationDatabase admin
```

## 📞 Support

Nếu gặp vấn đề, kiểm tra:

1. Docker là đã cài đặt và chạy
2. File `.env` được cấu hình đúng
3. Ports không bị xung đột
4. Đủ dung lượng disk và RAM
5. Docker volumes được tạo đúng
