# 🚦 Chatbot Rate Limiting API Documentation

## Tổng quan

Hệ thống chatbot có **giới hạn số lượng tin nhắn mỗi ngày** để tối ưu chi phí và quản lý tài nguyên:

| Loại User | Giới hạn | Reset Time |
|-----------|----------|------------|
| **Anonymous (Chưa đăng nhập)** | 15 tin nhắn/ngày | 00:00 mỗi ngày |
| **Authenticated (Đã đăng nhập)** | 100 tin nhắn/ngày | 00:00 mỗi ngày |

---

## 📋 Response Headers

Mọi request đến chatbot API sẽ trả về các headers sau:

```http
X-RateLimit-Limit: 15           # Giới hạn tối đa
X-RateLimit-Remaining: 12       # Số lượt còn lại
X-RateLimit-Reset: 43200        # Thời gian reset (seconds)
X-RateLimit-Type: anonymous     # Loại user (anonymous/authenticated)
```

---

## 🔴 Khi vượt quá giới hạn

### Response khi Anonymous vượt 15 lần:

**Status Code:** `429 Too Many Requests`

```json
{
  "success": false,
  "message": "Bạn đã hết lượt hỏi miễn phí (15/ngày). Vui lòng đăng nhập để tiếp tục!",
  "error": {
    "code": "CHATBOT_RATE_LIMIT_EXCEEDED",
    "limit": 15,
    "current": 15,
    "remaining": 0,
    "resetInSeconds": 43200,
    "resetAt": "2024-12-11T00:00:00.000Z",
    "requiresLogin": true
  },
  "suggestion": "Đăng nhập để được 100 lượt hỏi mỗi ngày thay vì 15 lượt!"
}
```

### Response khi Authenticated vượt 100 lần:

**Status Code:** `429 Too Many Requests`

```json
{
  "success": false,
  "message": "Bạn đã vượt quá giới hạn 100 tin nhắn/ngày. Vui lòng thử lại vào ngày mai!",
  "error": {
    "code": "CHATBOT_RATE_LIMIT_EXCEEDED",
    "limit": 100,
    "current": 100,
    "remaining": 0,
    "resetInSeconds": 21600,
    "resetAt": "2024-12-11T00:00:00.000Z",
    "requiresLogin": false
  },
  "suggestion": "Bạn đã hết 100 lượt hỏi hôm nay. Vui lòng quay lại vào ngày mai!"
}
```

---

## 📡 API Endpoints với Rate Limiting

### 1. Anonymous Message (Chưa đăng nhập)

**Giới hạn:** 15 tin nhắn/ngày

**Request:**
```http
POST /api/chatbot/anonymous/message
Content-Type: application/json

{
  "message": "Gym có gói nào?"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "response": {
    "content": "THE GYM có 3 gói membership...",
    "type": "ai_response"
  },
  "conversationId": "conv_123...",
  "timestamp": "2024-12-10T10:30:00.000Z"
}
```

**Headers:**
```http
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 12
X-RateLimit-Reset: 43200
X-RateLimit-Type: anonymous
```

---

### 2. Authenticated Message (Đã đăng nhập)

**Giới hạn:** 100 tin nhắn/ngày

**Request:**
```http
POST /api/chatbot/message/:userId
Content-Type: application/json

{
  "message": "Gói tập của tôi còn bao nhiêu ngày?"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "response": {
    "content": "Gói Premium của bạn còn 23 ngày nữa...",
    "type": "ai_response"
  },
  "conversationId": "conv_456...",
  "userId": "user_123",
  "timestamp": "2024-12-10T10:30:00.000Z"
}
```

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 43200
X-RateLimit-Type: authenticated
```

---

## 🎨 Frontend Implementation Guide

### 1. **Hiển thị số lượt còn lại**

```typescript
interface RateLimitInfo {
  limit: number
  remaining: number
  resetInSeconds: number
  type: 'anonymous' | 'authenticated'
}

const ChatInterface: React.FC = () => {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)

  const sendMessage = async (message: string) => {
    try {
      const response = await fetch('/api/chatbot/anonymous/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      // Extract rate limit info from headers
      const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0')
      const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0')
      const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0')
      const type = response.headers.get('X-RateLimit-Type') as 'anonymous' | 'authenticated'

      setRateLimitInfo({ limit, remaining, resetInSeconds: reset, type })

      if (response.status === 429) {
        const error = await response.json()
        handleRateLimitExceeded(error)
        return
      }

      const data = await response.json()
      // Handle success...
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <div>
      {/* Display rate limit info */}
      {rateLimitInfo && (
        <div className="rate-limit-badge">
          Còn lại: {rateLimitInfo.remaining}/{rateLimitInfo.limit} lượt hỏi
        </div>
      )}

      {/* Chat interface */}
    </div>
  )
}
```

---

### 2. **Xử lý khi vượt quá giới hạn**

```typescript
const handleRateLimitExceeded = (error: any) => {
  const { requiresLogin, resetAt, suggestion } = error.error

  if (requiresLogin) {
    // Anonymous user exceeded 15 messages
    showDialog({
      title: '🔐 Đăng nhập để tiếp tục',
      message: suggestion,
      actions: [
        {
          label: 'Đăng nhập',
          onClick: () => navigate('/login'),
          primary: true,
        },
        {
          label: 'Đóng',
          onClick: () => {},
        },
      ],
    })
  } else {
    // Authenticated user exceeded 100 messages
    const resetTime = new Date(resetAt).toLocaleString('vi-VN')

    showDialog({
      title: '⏰ Đã hết lượt hỏi hôm nay',
      message: `${suggestion}\n\nReset vào lúc: ${resetTime}`,
      actions: [
        {
          label: 'Đã hiểu',
          onClick: () => {},
        },
      ],
    })
  }
}
```

---

### 3. **Warning khi sắp hết lượt**

```typescript
const showRateLimitWarning = (remaining: number, limit: number, type: string) => {
  const percentRemaining = (remaining / limit) * 100

  if (percentRemaining <= 20 && percentRemaining > 0) {
    // Show warning when less than 20% remaining
    const message = type === 'anonymous'
      ? `⚠️ Còn ${remaining}/15 lượt hỏi. Đăng nhập để được 100 lượt!`
      : `⚠️ Còn ${remaining}/100 lượt hỏi hôm nay.`

    showToast(message, 'warning')
  }
}
```

---

### 4. **Countdown Timer đến reset time**

```typescript
const RateLimitCountdown: React.FC<{ resetInSeconds: number }> = ({ resetInSeconds }) => {
  const [timeLeft, setTimeLeft] = useState(resetInSeconds)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const hours = Math.floor(timeLeft / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)
  const seconds = timeLeft % 60

  return (
    <div className="countdown">
      Reset sau: {hours}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </div>
  )
}
```

---

### 5. **Complete Example Component**

```typescript
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Message {
  id: string
  content: string
  type: 'user' | 'bot'
  timestamp: Date
}

interface RateLimitInfo {
  limit: number
  remaining: number
  resetInSeconds: number
  type: 'anonymous' | 'authenticated'
}

const ChatBot: React.FC<{ userId?: string }> = ({ userId }) => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)

  const isAuthenticated = !!userId

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading || isRateLimited) return

    setLoading(true)

    try {
      const endpoint = isAuthenticated
        ? `/api/chatbot/message/${userId}`
        : '/api/chatbot/anonymous/message'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage }),
      })

      // Extract rate limit info
      const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0')
      const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0')
      const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0')
      const type = response.headers.get('X-RateLimit-Type') as 'anonymous' | 'authenticated'

      setRateLimitInfo({ limit, remaining, resetInSeconds: reset, type })

      // Check if rate limited
      if (response.status === 429) {
        const error = await response.json()
        handleRateLimitExceeded(error)
        setIsRateLimited(true)
        return
      }

      // Success - add messages
      const data = await response.json()

      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          content: inputMessage,
          type: 'user',
          timestamp: new Date(),
        },
        {
          id: `bot-${Date.now()}`,
          content: data.response.content,
          type: 'bot',
          timestamp: new Date(data.timestamp),
        },
      ])

      setInputMessage('')

      // Show warning if running low
      if (remaining <= 3 && remaining > 0) {
        showWarning(remaining, limit, type)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Có lỗi xảy ra. Vui lòng thử lại!')
    } finally {
      setLoading(false)
    }
  }

  const handleRateLimitExceeded = (error: any) => {
    const { requiresLogin, suggestion } = error.error

    if (requiresLogin) {
      // Prompt login
      if (confirm(suggestion + '\n\nBạn có muốn đăng nhập không?')) {
        navigate('/login')
      }
    } else {
      alert(suggestion)
    }
  }

  const showWarning = (remaining: number, limit: number, type: string) => {
    const message = type === 'anonymous'
      ? `⚠️ Còn ${remaining}/15 lượt hỏi. Đăng nhập để được 100 lượt!`
      : `⚠️ Còn ${remaining}/100 lượt hỏi hôm nay.`

    // Show toast/notification
    console.warn(message)
  }

  return (
    <div className="chatbot-container">
      {/* Rate limit badge */}
      {rateLimitInfo && !isRateLimited && (
        <div className="rate-limit-badge">
          <span className={rateLimitInfo.remaining <= 3 ? 'text-warning' : 'text-success'}>
            {rateLimitInfo.remaining}/{rateLimitInfo.limit}
          </span>
          {' lượt hỏi còn lại'}
          {!isAuthenticated && (
            <button onClick={() => navigate('/login')} className="btn-upgrade">
              Đăng nhập để được 100 lượt
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.type}`}>
            {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="input-container">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={isRateLimited ? 'Đã hết lượt hỏi hôm nay' : 'Nhập tin nhắn...'}
          disabled={loading || isRateLimited}
        />
        <button onClick={sendMessage} disabled={loading || isRateLimited}>
          {loading ? 'Đang gửi...' : 'Gửi'}
        </button>
      </div>
    </div>
  )
}

export default ChatBot
```

---

## 🧪 Testing

### Test Anonymous Rate Limit (15/day):

```bash
# Send 16 messages from same IP
for i in {1..16}; do
  curl -X POST http://localhost:3000/api/chatbot/anonymous/message \
    -H "Content-Type: application/json" \
    -d '{"message": "Test message '$i'"}' \
    -i
  echo "\n---\n"
done
```

**Expected:**
- Messages 1-15: Status 200 OK
- Message 16: Status 429 Too Many Requests

### Test Authenticated Rate Limit (100/day):

```bash
# Send message as authenticated user
curl -X POST http://localhost:3000/api/chatbot/message/USER_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}' \
  -i
```

---

## 📊 Rate Limit Info Endpoint (Optional - for debugging)

Nếu muốn check trạng thái rate limit:

**Request:**
```http
GET /api/chatbot/rate-limit-status
  ?identifier=IP_OR_USER_ID
  &isAuthenticated=true
```

**Response:**
```json
{
  "identifier": "192.168.1.1",
  "isAuthenticated": false,
  "limit": 15,
  "current": 8,
  "remaining": 7,
  "resetInSeconds": 32400,
  "isLimitExceeded": false
}
```

---

## 🎯 Best Practices cho Frontend

### 1. **Lưu rate limit info trong state/context**
```typescript
const RateLimitContext = createContext<RateLimitInfo | null>(null)
```

### 2. **Show badge/indicator rõ ràng**
- Badge "Còn X/Y lượt hỏi" luôn hiển thị
- Màu đỏ khi < 20% remaining
- Button "Đăng nhập" cho anonymous users

### 3. **Disable input khi hết lượt**
- Disable input field
- Show message "Đã hết lượt hỏi hôm nay"
- Countdown đến reset time

### 4. **Local storage cho anonymous users**
- Lưu số lượt đã dùng để hiển thị ngay khi reload
- Sync với backend mỗi request

### 5. **Graceful degradation**
- Nếu backend rate limit fail → vẫn cho gửi message
- Log error nhưng không block user

---

## 🔧 Backend Implementation Notes

### Redis Keys Format:
```
chatbot:anon:192.168.1.1:2024-12-10    # Anonymous user
chatbot:user:user_123:2024-12-10       # Authenticated user
```

### Key Features:
- ✅ Sử dụng Redis INCR (atomic operation)
- ✅ Auto-expire vào 00:00 mỗi ngày
- ✅ Separate limits cho anonymous vs authenticated
- ✅ Graceful error handling (cho phép request nếu Redis fail)

---

## ❓ FAQ

### Q: Nếu user đăng nhập sau khi hết 15 lượt anonymous?
**A:** User sẽ được reset về 100 lượt mới vì Redis key khác nhau (`chatbot:anon` vs `chatbot:user`)

### Q: Nếu Redis bị down?
**A:** Middleware sẽ catch error và cho phép request đi qua (fail-open) để không block chatbot

### Q: Reset time chính xác là lúc nào?
**A:** 00:00:00 theo server timezone (UTC)

### Q: Có thể tăng limit cho VIP users không?
**A:** Có thể customize middleware để check user role và áp dụng limit khác nhau

---

## 📞 Support

Nếu có vấn đề về rate limiting:
1. Check response headers `X-RateLimit-*`
2. Check Redis key: `redis-cli GET "chatbot:anon:IP:DATE"`
3. Liên hệ backend team với thông tin: IP, userId, timestamp

---

**Updated:** 2024-12-10
**Version:** 2.0 - OpenAI Function Calling with Redis Rate Limiting
