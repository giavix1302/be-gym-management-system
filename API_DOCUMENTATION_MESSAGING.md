# API Documentation - Messaging System (User - PT Chat)

## Tổng quan
API này cho phép người dùng (User) nhắn tin trực tiếp với Personal Trainer (PT) trong hệ thống quản lý phòng gym. Hệ thống hỗ trợ real-time messaging qua Socket.IO và REST API.

**Base URL:** `http://your-domain.com/v1/conversations`

**Authentication:** Bearer Token (JWT) trong header `Authorization`

---

## Mục lục
1. [Authentication](#authentication)
2. [REST API Endpoints](#rest-api-endpoints)
3. [Socket.IO Real-time Events](#socketio-real-time-events)
4. [Data Models](#data-models)
5. [Error Responses](#error-responses)
6. [Flow Diagrams](#flow-diagrams)
7. [Frontend Integration Guide](#frontend-integration-guide)

---

## Authentication

### HTTP Request Authentication
Tất cả endpoints yêu cầu JWT token trong header:

```http
Authorization: Bearer <your_jwt_token>
```

**Token payload contains:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "role": "user" | "pt" | "admin" | "staff",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Socket.IO Authentication
Khi kết nối Socket.IO, token có thể gửi qua:
- `socket.handshake.auth.token`
- `socket.handshake.query.token`
- `socket.handshake.headers.authorization`

```javascript
const socket = io('http://your-domain.com', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

---

## REST API Endpoints

### 1. Tạo hoặc Lấy Conversation

**Endpoint:** `POST /v1/conversations`

**Mô tả:** Tạo conversation mới giữa user và trainer, hoặc lấy conversation đã tồn tại.

**Authentication:** Required

**Request Body:**
```json
{
  "trainerId": "string (required) - ObjectId của trainer",
  "bookingId": "string (required) - ObjectId của booking"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Cuộc trò chuyện đã được tạo thành công",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "trainerId": "507f1f77bcf86cd799439013",
    "firstBookingId": "507f1f77bcf86cd799439014",
    "lastMessage": "",
    "lastMessageAt": null,
    "createdAt": "2025-01-10T10:30:00.000Z",
    "updatedAt": null,
    "_destroy": false
  },
  "isNew": true
}
```

**Success Response (200 OK - Existing):**
```json
{
  "success": true,
  "message": "Cuộc trò chuyện đã tồn tại",
  "data": { /* conversation object */ },
  "isNew": false
}
```

**Error Responses:**
- `400` - Missing required fields
- `401` - Unauthorized
- `404` - User/Trainer/Booking not found
- `500` - Internal server error

**Frontend Example:**
```javascript
const createConversation = async (trainerId, bookingId) => {
  const response = await fetch('/v1/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ trainerId, bookingId })
  });
  return await response.json();
};
```

---

### 2. Lấy Danh Sách Conversations

**Endpoint:** `GET /v1/conversations/:userId`

**Mô tả:** Lấy danh sách tất cả conversations của user hoặc PT với phân trang.

**Authentication:** Required

**URL Parameters:**
- `userId` (string, required) - ID của user hoặc PT

**Query Parameters:**
- `page` (number, optional, default: 1) - Số trang
- `limit` (number, optional, default: 20) - Số lượng conversations mỗi trang
- `role` (string, optional, values: "user" | "pt") - Role của người request
  - `"user"` - Lấy conversations khi user là customer
  - `"pt"` - Lấy conversations khi PT là customer hoặc là trainer

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f1f77bcf86cd799439012",
        "username": "john_doe",
        "email": "john@example.com",
        "fullName": "John Doe",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "trainerId": {
        "_id": "507f1f77bcf86cd799439013",
        "userId": "507f1f77bcf86cd799439015",
        "specialization": "Yoga",
        "experienceYears": 5,
        "user": {
          "fullName": "Jane Smith",
          "avatarUrl": "https://example.com/trainer-avatar.jpg"
        }
      },
      "firstBookingId": "507f1f77bcf86cd799439014",
      "lastMessage": "Cảm ơn bạn!",
      "lastMessageAt": "2025-01-10T15:30:00.000Z",
      "lastSenderId": "507f1f77bcf86cd799439012",
      "unreadCount": 3,
      "createdAt": "2025-01-10T10:30:00.000Z",
      "updatedAt": "2025-01-10T15:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 95,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `404` - User not found
- `500` - Internal server error

**Frontend Example:**
```javascript
const getConversations = async (userId, page = 1, limit = 20, role = 'user') => {
  const response = await fetch(
    `/v1/conversations/${userId}?page=${page}&limit=${limit}&role=${role}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return await response.json();
};
```

---

### 3. Lấy Tin Nhắn trong Conversation

**Endpoint:** `GET /v1/conversations/:conversationId/messages`

**Mô tả:** Lấy danh sách tin nhắn trong một conversation với phân trang.

**Authentication:** Required

**URL Parameters:**
- `conversationId` (string, required) - ID của conversation

**Query Parameters:**
- `page` (number, optional, default: 1) - Số trang
- `limit` (number, optional, default: 50) - Số tin nhắn mỗi trang
- `role` (string, optional) - Role của user ("user" | "pt")

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "conversationId": "507f1f77bcf86cd799439011",
    "messages": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "conversationId": "507f1f77bcf86cd799439011",
        "senderId": "507f1f77bcf86cd799439012",
        "senderType": "user",
        "content": "Xin chào coach!",
        "timestamp": "2025-01-10T10:35:00.000Z",
        "isRead": true,
        "createdAt": "2025-01-10T10:35:00.000Z",
        "updatedAt": null
      },
      {
        "_id": "507f1f77bcf86cd799439021",
        "conversationId": "507f1f77bcf86cd799439011",
        "senderId": "507f1f77bcf86cd799439013",
        "senderType": "trainer",
        "content": "Chào bạn! Tôi có thể giúp gì cho bạn?",
        "timestamp": "2025-01-10T10:36:00.000Z",
        "isRead": false,
        "createdAt": "2025-01-10T10:36:00.000Z",
        "updatedAt": null
      }
    ]
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 120,
    "itemsPerPage": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Error Responses:**
- `400` - Invalid conversation ID
- `401` - Unauthorized
- `403` - User is not participant of this conversation
- `404` - Conversation not found
- `500` - Internal server error

**Frontend Example:**
```javascript
const getMessages = async (conversationId, page = 1, limit = 50) => {
  const response = await fetch(
    `/v1/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return await response.json();
};
```

---

### 4. Gửi Tin Nhắn

**Endpoint:** `POST /v1/conversations/:conversationId/messages`

**Mô tả:** Gửi tin nhắn mới trong conversation. Hệ thống sẽ emit real-time event qua Socket.IO.

**Authentication:** Required

**URL Parameters:**
- `conversationId` (string, required) - ID của conversation

**Request Body:**
```json
{
  "content": "string (required) - Nội dung tin nhắn"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Tin nhắn đã được gửi thành công",
  "data": {
    "_id": "507f1f77bcf86cd799439022",
    "conversationId": "507f1f77bcf86cd799439011",
    "senderId": "507f1f77bcf86cd799439012",
    "senderType": "user",
    "content": "Tôi muốn hỏi về lịch tập",
    "timestamp": "2025-01-10T11:00:00.000Z",
    "isRead": false,
    "createdAt": "2025-01-10T11:00:00.000Z",
    "updatedAt": null,
    "_destroy": false
  }
}
```

**Real-time Event Emitted:**
Sau khi gửi tin nhắn, server sẽ emit event `new_message` tới tất cả clients trong room `conversation_{conversationId}`.

**Error Responses:**
- `400` - Missing content or invalid data
- `401` - Unauthorized
- `403` - User is not participant of this conversation
- `404` - Conversation not found
- `500` - Internal server error

**Frontend Example:**
```javascript
const sendMessage = async (conversationId, content) => {
  const response = await fetch(
    `/v1/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    }
  );
  return await response.json();
};
```

---

### 5. Đánh Dấu Tin Nhắn Đã Đọc

**Endpoint:** `PUT /v1/conversations/:conversationId/messages/read`

**Mô tả:** Đánh dấu nhiều tin nhắn là đã đọc. Hệ thống sẽ emit real-time event qua Socket.IO.

**Authentication:** Required

**URL Parameters:**
- `conversationId` (string, required) - ID của conversation

**Request Body:**
```json
{
  "messageIds": [
    "507f1f77bcf86cd799439020",
    "507f1f77bcf86cd799439021",
    "507f1f77bcf86cd799439022"
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Đã đánh dấu tin nhắn là đã đọc",
  "data": {
    "updatedCount": 3
  }
}
```

**Real-time Event Emitted:**
Server sẽ emit event `messages_read` tới tất cả clients trong room.

**Error Responses:**
- `400` - Invalid message IDs
- `401` - Unauthorized
- `403` - User is not participant of this conversation
- `404` - Conversation not found
- `500` - Internal server error

**Frontend Example:**
```javascript
const markMessagesAsRead = async (conversationId, messageIds) => {
  const response = await fetch(
    `/v1/conversations/${conversationId}/messages/read`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ messageIds })
    }
  );
  return await response.json();
};
```

---

### 6. Lấy Số Lượng Tin Nhắn Chưa Đọc

**Endpoint:** `GET /v1/conversations/unread-count`

**Mô tả:** Lấy tổng số tin nhắn chưa đọc của user và chi tiết theo từng conversation.

**Authentication:** Required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalUnread": 15,
    "conversations": [
      {
        "conversationId": "507f1f77bcf86cd799439011",
        "unreadCount": 5
      },
      {
        "conversationId": "507f1f77bcf86cd799439012",
        "unreadCount": 10
      }
    ]
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `500` - Internal server error

**Frontend Example:**
```javascript
const getUnreadCount = async () => {
  const response = await fetch('/v1/conversations/unread-count', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

---

## Socket.IO Real-time Events

### Connection Setup

**Server URL:** `http://your-domain.com`

**Configuration:**
```javascript
import io from 'socket.io-client';

const socket = io('http://your-domain.com', {
  auth: {
    token: 'your_jwt_token'
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

**CORS Settings:**
- Allowed origins: `localhost:5173`, `localhost:3000`, và production URL
- Methods: `GET`, `POST`
- Credentials: `true`

**Timeouts:**
- Ping Timeout: 60000ms (60s)
- Ping Interval: 25000ms (25s)

---

### Events to Emit (Client → Server)

#### 1. join_conversation
**Mô tả:** Join vào room của conversation để nhận real-time updates.

**Emit:**
```javascript
socket.emit('join_conversation', conversationId);
```

**Parameters:**
- `conversationId` (string) - ID của conversation

**Use case:** Gọi khi user mở conversation để bắt đầu nhận tin nhắn real-time.

---

#### 2. leave_conversation
**Mô tả:** Rời khỏi room của conversation.

**Emit:**
```javascript
socket.emit('leave_conversation', conversationId);
```

**Parameters:**
- `conversationId` (string) - ID của conversation

**Use case:** Gọi khi user đóng conversation hoặc chuyển sang conversation khác.

---

#### 3. typing
**Mô tả:** Thông báo user đang typing trong conversation.

**Emit:**
```javascript
socket.emit('typing', {
  conversationId: '507f1f77bcf86cd799439011',
  isTyping: true
});
```

**Parameters:**
```typescript
{
  conversationId: string;
  isTyping: boolean;
}
```

**Use case:** Gọi khi user bắt đầu hoặc dừng typing.

---

### Events to Listen (Server → Client)

#### 1. new_message
**Mô tả:** Nhận tin nhắn mới trong conversation.

**Listener:**
```javascript
socket.on('new_message', (data) => {
  console.log('New message received:', data);
  // Update UI with new message
});
```

**Data Structure:**
```typescript
{
  _id: string;
  conversationId: string;
  senderId: string;
  senderType: 'user' | 'trainer';
  content: string;
  timestamp: string; // ISO 8601 format
  isRead: boolean;
  createdAt: string;
  updatedAt: string | null;
}
```

**Use case:** Tự động hiển thị tin nhắn mới trong conversation.

---

#### 2. messages_read
**Mô tả:** Nhận thông báo khi tin nhắn được đánh dấu đã đọc.

**Listener:**
```javascript
socket.on('messages_read', (data) => {
  console.log('Messages marked as read:', data);
  // Update read status in UI
});
```

**Data Structure:**
```typescript
{
  conversationId: string;
  messageIds: string[];
  updatedCount: number;
}
```

**Use case:** Cập nhật trạng thái đã đọc của tin nhắn trong UI.

---

#### 3. user_typing
**Mô tả:** Nhận thông báo khi user khác đang typing.

**Listener:**
```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
  // Show typing indicator
});
```

**Data Structure:**
```typescript
{
  conversationId: string;
  userId: string;
  isTyping: boolean;
}
```

**Use case:** Hiển thị indicator "đang nhập..." trong conversation.

---

#### 4. connect
**Mô tả:** Kết nối Socket.IO thành công.

**Listener:**
```javascript
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});
```

---

#### 5. disconnect
**Mô tả:** Mất kết nối Socket.IO.

**Listener:**
```javascript
socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});
```

---

#### 6. connect_error
**Mô tả:** Lỗi khi kết nối Socket.IO.

**Listener:**
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

---

### Socket Status Endpoint

**Endpoint:** `GET /v1/socket/status`

**Mô tả:** Kiểm tra trạng thái Socket.IO server và số lượng user online.

**Response:**
```json
{
  "success": true,
  "onlineUsers": 42,
  "users": [
    {
      "userId": "507f1f77bcf86cd799439012",
      "socketCount": 2
    }
  ]
}
```

---

## Data Models

### Conversation Model
```typescript
interface Conversation {
  _id: string;
  userId: string;                    // ObjectId của user (customer)
  trainerId: string;                 // ObjectId của trainer record
  firstBookingId: string;            // ObjectId của booking đầu tiên
  lastMessage: string;               // Nội dung tin nhắn cuối cùng
  lastMessageAt: Date | null;        // Thời gian tin nhắn cuối
  createdAt: Date;
  updatedAt: Date | null;
  _destroy: boolean;                 // Soft delete flag
}
```

### Message Model
```typescript
interface Message {
  _id: string;
  conversationId: string;            // ObjectId của conversation
  senderId: string;                  // ObjectId của người gửi
  senderType: 'user' | 'trainer';   // Loại người gửi
  content: string;                   // Nội dung tin nhắn
  timestamp: Date;                   // Thời gian gửi
  isRead: boolean;                   // Trạng thái đã đọc
  createdAt: Date;
  updatedAt: Date | null;
  _destroy: boolean;                 // Soft delete flag
}
```

### Conversation with Details (from getConversations)
```typescript
interface ConversationDetail {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
  trainerId: {
    _id: string;
    userId: string;
    specialization: string;
    experienceYears: number;
    user: {
      fullName: string;
      avatarUrl?: string;
    };
  };
  firstBookingId: string;
  lastMessage: string;
  lastMessageAt: Date | null;
  lastSenderId: string;              // ID của người gửi tin nhắn cuối
  unreadCount: number;               // Số tin nhắn chưa đọc
  createdAt: Date;
  updatedAt: Date | null;
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error message description",
  "error": "Error details (only in development mode)"
}
```

### Common HTTP Status Codes

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Vui lòng cung cấp đầy đủ thông tin trainerId và bookingId"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Token không hợp lệ hoặc đã hết hạn"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Bạn không có quyền truy cập vào cuộc trò chuyện này"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Không tìm thấy người dùng"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Đã xảy ra lỗi khi gửi tin nhắn",
  "error": "Error details..."
}
```

---

## Flow Diagrams

### Flow 1: Tạo Conversation và Gửi Tin Nhắn Đầu Tiên

```
User (Frontend)
    |
    | 1. POST /v1/conversations
    |    { trainerId, bookingId }
    v
  Server
    |
    | 2. Validate user, trainer, booking
    | 3. Check conversation exists
    | 4. Create new or return existing
    v
    |
    | Response: { conversationId, isNew }
    v
User (Frontend)
    |
    | 5. socket.emit('join_conversation', conversationId)
    v
  Server
    |
    | 6. socket.join(room)
    v
User (Frontend)
    |
    | 7. POST /v1/conversations/:id/messages
    |    { content: "Hello" }
    v
  Server
    |
    | 8. Create message
    | 9. Update conversation lastMessage
    | 10. socket.emit('new_message', messageData)
    v
All Clients in Room
    |
    | 11. Receive 'new_message' event
    | 12. Update UI
```

---

### Flow 2: Nhận Tin Nhắn Real-time

```
User A (Sender)                          User B (Receiver)
    |                                           |
    | 1. POST /messages                         |
    v                                           |
  Server                                        |
    |                                           |
    | 2. Create message                         |
    | 3. Emit 'new_message' to room             |
    |------------------------------------------>|
    |                                           v
    |                                    Receive event
    |                                           |
    |                                    4. Update UI
    |                                    5. Show message
    |                                           |
    |                                    6. PUT /messages/read
    |<------------------------------------------|
    v                                           |
  Server                                        |
    |                                           |
    | 7. Update isRead = true                   |
    | 8. Emit 'messages_read' to room           |
    |------------------------------------------>|
    v                                           v
User A receives read receipt          Message marked as read
```

---

### Flow 3: Typing Indicator

```
User A                                   User B
    |                                       |
    | 1. User starts typing                 |
    | 2. socket.emit('typing', {            |
    |      conversationId,                  |
    |      isTyping: true                   |
    |    })                                 |
    v                                       |
  Server                                    |
    |                                       |
    | 3. Broadcast 'user_typing' to room    |
    |-------------------------------------->|
    |                                       v
    |                                Show "đang nhập..."
    |                                       |
    | (After 3s of no typing)               |
    | 4. socket.emit('typing', {            |
    |      conversationId,                  |
    |      isTyping: false                  |
    |    })                                 |
    v                                       |
  Server                                    |
    |                                       |
    | 5. Broadcast 'user_typing' to room    |
    |-------------------------------------->|
    |                                       v
    |                                Hide "đang nhập..."
```

---

## Frontend Integration Guide

### 1. Setup Socket.IO Client

**Install:**
```bash
npm install socket.io-client
```

**Create socket service:**
```javascript
// services/socket.service.js
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    this.socket = io(process.env.REACT_APP_API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupListeners();
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });
  }

  joinConversation(conversationId) {
    this.socket.emit('join_conversation', conversationId);
  }

  leaveConversation(conversationId) {
    this.socket.emit('leave_conversation', conversationId);
  }

  sendTyping(conversationId, isTyping) {
    this.socket.emit('typing', { conversationId, isTyping });
  }

  onNewMessage(callback) {
    this.socket.on('new_message', callback);
  }

  onMessagesRead(callback) {
    this.socket.on('messages_read', callback);
  }

  onUserTyping(callback) {
    this.socket.on('user_typing', callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new SocketService();
```

---

### 2. React Hook for Messaging

```javascript
// hooks/useMessaging.js
import { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socket.service';

export const useMessaging = (conversationId, token) => {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/v1/conversations/${conversationId}/messages`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        const data = await response.json();
        if (data.success) {
          setMessages(data.data.messages);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId, token]);

  // Setup Socket.IO
  useEffect(() => {
    if (!conversationId) return;

    socketService.connect(token);
    socketService.joinConversation(conversationId);

    // Listen for new messages
    socketService.onNewMessage((newMessage) => {
      if (newMessage.conversationId === conversationId) {
        setMessages(prev => [...prev, newMessage]);
      }
    });

    // Listen for messages read
    socketService.onMessagesRead((data) => {
      if (data.conversationId === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            data.messageIds.includes(msg._id)
              ? { ...msg, isRead: true }
              : msg
          )
        );
      }
    });

    // Listen for typing
    socketService.onUserTyping((data) => {
      if (data.conversationId === conversationId) {
        setTyping(data.isTyping);
      }
    });

    return () => {
      socketService.leaveConversation(conversationId);
      socketService.disconnect();
    };
  }, [conversationId, token]);

  // Send message
  const sendMessage = useCallback(async (content) => {
    try {
      const response = await fetch(
        `/v1/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content })
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [conversationId, token]);

  // Mark as read
  const markAsRead = useCallback(async (messageIds) => {
    try {
      await fetch(
        `/v1/conversations/${conversationId}/messages/read`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ messageIds })
        }
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId, token]);

  // Handle typing
  const handleTyping = useCallback((isTyping) => {
    socketService.sendTyping(conversationId, isTyping);
  }, [conversationId]);

  return {
    messages,
    typing,
    loading,
    sendMessage,
    markAsRead,
    handleTyping
  };
};
```

---

### 3. React Component Example

```javascript
// components/ChatBox.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useMessaging } from '../hooks/useMessaging';

const ChatBox = ({ conversationId, token }) => {
  const [inputValue, setInputValue] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);

  const {
    messages,
    typing,
    loading,
    sendMessage,
    markAsRead,
    handleTyping
  } = useMessaging(conversationId, token);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark unread messages as read
  useEffect(() => {
    const unreadMessages = messages
      .filter(msg => !msg.isRead && msg.senderType !== 'user')
      .map(msg => msg._id);

    if (unreadMessages.length > 0) {
      markAsRead(unreadMessages);
    }
  }, [messages, markAsRead]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    // Send typing indicator
    handleTyping(true);

    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing indicator
    const timeout = setTimeout(() => {
      handleTyping(false);
    }, 3000);

    setTypingTimeout(timeout);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      await sendMessage(inputValue);
      setInputValue('');
      handleTyping(false);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (loading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="chat-box">
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`message ${message.senderType === 'user' ? 'sent' : 'received'}`}
          >
            <div className="message-content">{message.content}</div>
            <div className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
              {message.senderType === 'user' && (
                <span className="read-status">
                  {message.isRead ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {typing && (
        <div className="typing-indicator">
          PT đang nhập...
        </div>
      )}

      <form onSubmit={handleSubmit} className="message-input">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Nhập tin nhắn..."
        />
        <button type="submit">Gửi</button>
      </form>
    </div>
  );
};

export default ChatBox;
```

---

### 4. Conversation List Component

```javascript
// components/ConversationList.jsx
import React, { useState, useEffect } from 'react';

const ConversationList = ({ userId, token, onSelectConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch(
          `/v1/conversations/${userId}?role=user`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        const data = await response.json();
        if (data.success) {
          setConversations(data.data);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [userId, token]);

  if (loading) {
    return <div>Loading conversations...</div>;
  }

  return (
    <div className="conversation-list">
      {conversations.map((conv) => (
        <div
          key={conv._id}
          className="conversation-item"
          onClick={() => onSelectConversation(conv._id)}
        >
          <img
            src={conv.trainerId.user.avatarUrl || '/default-avatar.png'}
            alt={conv.trainerId.user.fullName}
            className="avatar"
          />
          <div className="conversation-info">
            <div className="trainer-name">
              {conv.trainerId.user.fullName}
            </div>
            <div className="last-message">{conv.lastMessage}</div>
          </div>
          {conv.unreadCount > 0 && (
            <div className="unread-badge">{conv.unreadCount}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ConversationList;
```

---

### 5. Create Conversation

```javascript
// services/conversation.service.js
export const createConversation = async (trainerId, bookingId, token) => {
  try {
    const response = await fetch('/v1/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ trainerId, bookingId })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

// Usage in component
const handleStartChat = async () => {
  const result = await createConversation(trainerId, bookingId, token);
  if (result.success) {
    // Navigate to chat screen with conversationId
    navigate(`/chat/${result.data._id}`);
  }
};
```

---

### 6. Unread Count Badge

```javascript
// components/UnreadBadge.jsx
import React, { useState, useEffect } from 'react';

const UnreadBadge = ({ token }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/v1/conversations/unread-count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.data.totalUnread);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [token]);

  if (unreadCount === 0) return null;

  return (
    <span className="unread-badge">{unreadCount}</span>
  );
};

export default UnreadBadge;
```

---

## Best Practices

### 1. Error Handling
```javascript
try {
  const response = await fetch('/v1/conversations/...');
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  if (!data.success) {
    throw new Error(data.message);
  }

  // Handle success
} catch (error) {
  console.error('Error:', error);
  // Show user-friendly error message
}
```

### 2. Socket.IO Reconnection
```javascript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server forcefully disconnected, reconnect manually
    socket.connect();
  }
  // Else socket will automatically try to reconnect
});
```

### 3. Memory Management
```javascript
useEffect(() => {
  // Setup socket listeners

  return () => {
    // Cleanup: remove listeners and disconnect
    socket.off('new_message');
    socket.off('messages_read');
    socket.off('user_typing');
    socket.disconnect();
  };
}, []);
```

### 4. Pagination
```javascript
const loadMoreMessages = async (page) => {
  const response = await fetch(
    `/v1/conversations/${conversationId}/messages?page=${page}&limit=50`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const data = await response.json();

  if (data.success) {
    setMessages(prev => [...data.data.messages, ...prev]);
  }
};
```

### 5. Optimistic UI Updates
```javascript
const sendMessage = async (content) => {
  // Add message to UI immediately
  const tempMessage = {
    _id: `temp-${Date.now()}`,
    content,
    timestamp: new Date().toISOString(),
    senderType: 'user',
    isRead: false,
    sending: true
  };

  setMessages(prev => [...prev, tempMessage]);

  try {
    const response = await fetch('/.../messages', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    const data = await response.json();

    // Replace temp message with real message
    setMessages(prev =>
      prev.map(msg =>
        msg._id === tempMessage._id ? data.data : msg
      )
    );
  } catch (error) {
    // Remove temp message on error
    setMessages(prev =>
      prev.filter(msg => msg._id !== tempMessage._id)
    );
    // Show error notification
  }
};
```

---

## Rate Limiting

**Current Implementation:**
- Chat rate limiter is available: 50 messages per minute
- Not yet applied to conversation routes

**Recommendation:** Apply rate limiting to prevent spam:
```javascript
// In conversation.route.js
import { commonRateLimiters } from '../../../middlewares/rateLimit.middleware.js';

router.post(
  '/:conversationId/messages',
  authMiddleware,
  commonRateLimiters.chat,  // Add this
  conversationController.sendMessage
);
```

---

## Security Considerations

1. **Authentication:** All endpoints require valid JWT token
2. **Authorization:** Users can only access conversations they are participants of
3. **Input Validation:** Content is validated before saving to database
4. **XSS Prevention:** Sanitize message content on frontend before rendering
5. **Rate Limiting:** Prevent spam and abuse
6. **CORS:** Restrict to allowed origins only
7. **Socket.IO Auth:** JWT verification on socket connection

---

## Testing

### Manual Testing with curl

**1. Create Conversation:**
```bash
curl -X POST http://localhost:3000/v1/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"trainerId":"507f1f77bcf86cd799439013","bookingId":"507f1f77bcf86cd799439014"}'
```

**2. Send Message:**
```bash
curl -X POST http://localhost:3000/v1/conversations/507f1f77bcf86cd799439011/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content":"Hello PT!"}'
```

**3. Get Messages:**
```bash
curl http://localhost:3000/v1/conversations/507f1f77bcf86cd799439011/messages?page=1&limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**4. Mark as Read:**
```bash
curl -X PUT http://localhost:3000/v1/conversations/507f1f77bcf86cd799439011/messages/read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"messageIds":["507f1f77bcf86cd799439020"]}'
```

### Testing Socket.IO

Use online tool: https://amritb.github.io/socketio-client-tool/

**Connect:**
- URL: `http://localhost:3000`
- Auth: `{ "token": "YOUR_JWT_TOKEN" }`

**Emit events:**
```json
{
  "event": "join_conversation",
  "data": "507f1f77bcf86cd799439011"
}
```

---

## TODO / Future Enhancements

1. **Push Notifications** - Send notifications to offline users
2. **Message Validation** - Implement validation schemas
3. **File Attachments** - Support sending images/files
4. **Message Editing** - Allow users to edit sent messages
5. **Message Deletion** - Allow users to delete messages
6. **Read Receipts** - Show who read the message and when
7. **Group Conversations** - Support multiple participants
8. **Search Messages** - Full-text search in conversations
9. **Rate Limiting** - Apply chat rate limiter to routes
10. **Message Reactions** - Add emoji reactions to messages

---

## Support

Nếu bạn gặp vấn đề hoặc có câu hỏi về API, vui lòng liên hệ team development hoặc tạo issue trong repository.

**Phiên bản:** 1.0
**Ngày cập nhật:** 2025-01-10
