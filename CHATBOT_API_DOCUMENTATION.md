# 🤖 AI Chatbot API Documentation v2.0

## 📋 Tổng quan

API Chatbot đã được **REBUILD HOÀN TOÀN** với Gemini AI Function Calling:
- ✨ **AI thông minh thật sự** - không còn pattern matching cứng
- ✨ **Context-aware** - nhớ 10 messages gần nhất
- ✨ **Real-time data** từ database
- ✨ **Cá nhân hóa** với authentication
- ✨ **Trả lời mọi câu hỏi** và lái về gym tự nhiên

**Base URL:** `/api/chatbot`

---

## 🚀 Core Endpoints

### 1. Health Check

Kiểm tra trạng thái service chatbot.

```http
GET /api/chatbot/health
```

**Response:**
```json
{
  "success": true,
  "message": "AI Chatbot service is healthy",
  "timestamp": "2025-12-10T10:30:00.000Z",
  "aiStatus": "connected",
  "version": "2.0 - Gemini Function Calling"
}
```

---

### 2. Anonymous Chat (Chưa đăng nhập)

Gửi tin nhắn cho AI khi user chưa đăng nhập.

```http
POST /api/chatbot/anonymous/message
```

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Gym có những gói membership nào?",
  "anonymousId": "anon_1702123456_abc123"  // Optional, generated nếu null
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "content": "THE GYM có 3 gói membership:\n\n💪 Gói Basic - 500,000đ/tháng\n• Tập tại 1 cơ sở\n• Không giới hạn thời gian tập\n\n⭐ Gói Premium - 1,500,000đ/3 tháng\n• Tập tại tất cả cơ sở\n• Tham gia lớp nhóm miễn phí\n\n👑 Gói VIP - 3,000,000đ/6 tháng\n• Tất cả quyền lợi Premium\n• PT cá nhân 2 buổi/tháng\n\nBạn quan tâm gói nào ạ?",
    "type": "ai_response"
  },
  "conversationId": "674d8e9f1234567890abcdef",
  "anonymousId": "anon_1702123456_abc123",
  "timestamp": "2025-12-10T10:30:00.000Z"
}
```

**Rate Limit:** 10 requests/minute per IP

---

### 3. Authenticated Chat (Đã đăng nhập)

Gửi tin nhắn cho AI khi user đã đăng nhập. AI có thể trả lời câu hỏi cá nhân hóa.

```http
POST /api/chatbot/message/:userId
```

**URL Parameters:**
- `userId` (string, required) - ID của user đã đăng nhập

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Gói tập của tôi còn bao nhiêu ngày?"
}
```

**Response - Authenticated Query:**
```json
{
  "success": true,
  "response": {
    "content": "Chào Nguyễn Văn A! 👋\n\nGói Premium của bạn còn 25 ngày, sẽ hết hạn vào 05/01/2026.\n\n📦 Thông tin gói:\n• Gói Premium - 1,500,000đ/3 tháng\n• Tập tại tất cả cơ sở\n• Tham gia lớp nhóm miễn phí\n\n💡 Bạn có muốn gia hạn sớm để nhận ưu đãi không?",
    "type": "ai_response"
  },
  "conversationId": "674d8e9f1234567890abcdef",
  "timestamp": "2025-12-10T10:30:00.000Z"
}
```

**Response - General Query:**
```json
{
  "success": true,
  "response": {
    "content": "Gym mở cửa từ 06:00 - 22:00 hàng ngày, kể cả cuối tuần và ngày lễ! ⏰\n\nBạn có muốn đặt lịch tập với PT hoặc đăng ký lớp học không?",
    "type": "ai_response"
  },
  "conversationId": "674d8e9f1234567890abcdef",
  "timestamp": "2025-12-10T10:30:00.000Z"
}
```

**Rate Limit:** 20 requests/minute per user

---

### 4. Get Conversation History

Lấy lịch sử conversation của user.

```http
GET /api/chatbot/conversation/:userId
GET /api/chatbot/conversation/:userId/:conversationId
```

**URL Parameters:**
- `userId` (string, required) - ID của user
- `conversationId` (string, optional) - ID của conversation cụ thể

**Response:**
```json
{
  "success": true,
  "conversation": {
    "_id": "674d8e9f1234567890abcdef",
    "userId": "6922d2e9f19f6286245443e3",
    "userType": "authenticated",
    "sessionId": "session_1702123456_xyz789",
    "messages": [
      {
        "type": "user",
        "content": "Gym có gói nào?",
        "timestamp": "2025-12-10T10:25:00.000Z"
      },
      {
        "type": "bot",
        "content": "THE GYM có 3 gói membership: Basic, Premium, VIP...",
        "timestamp": "2025-12-10T10:25:02.000Z"
      },
      {
        "type": "user",
        "content": "Gói tập của tôi còn bao nhiêu ngày?",
        "timestamp": "2025-12-10T10:26:00.000Z"
      },
      {
        "type": "bot",
        "content": "Gói Premium của bạn còn 25 ngày...",
        "timestamp": "2025-12-10T10:26:03.000Z"
      }
    ],
    "status": "active",
    "lastActiveAt": "2025-12-10T10:26:03.000Z",
    "createdAt": "2025-12-10T10:25:00.000Z"
  },
  "messageCount": 4
}
```

---

### 5. Get Anonymous Conversation History

Lấy lịch sử conversation của anonymous user.

```http
GET /api/chatbot/anonymous/conversation/:anonymousId
```

**URL Parameters:**
- `anonymousId` (string, required) - ID của anonymous session

**Response:** Similar to authenticated conversation history

---

### 6. Link Anonymous Conversation to User

Link conversation của anonymous user vào account sau khi đăng nhập.

```http
POST /api/chatbot/link-anonymous/:userId
```

**URL Parameters:**
- `userId` (string, required) - ID của user vừa đăng nhập

**Request Body:**
```json
{
  "anonymousId": "anon_1702123456_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Anonymous conversation linked successfully",
  "conversationId": "674d8e9f1234567890abcdef"
}
```

---

### 7. Get User's All Conversations

Lấy tất cả conversations của user (để hiển thị history).

```http
GET /api/chatbot/my/conversations/:userId
```

**URL Parameters:**
- `userId` (string, required) - ID của user

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "_id": "674d8e9f1234567890abcdef",
      "userId": "6922d2e9f19f6286245443e3",
      "sessionId": "session_1702123456_xyz789",
      "status": "active",
      "messageCount": 10,
      "lastMessage": "Cảm ơn bạn!",
      "lastActiveAt": "2025-12-10T10:30:00.000Z",
      "createdAt": "2025-12-10T09:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## ⚠️ DEPRECATED Endpoints

**Các endpoints này vẫn hoạt động nhưng KHÔNG còn cần thiết** vì AI xử lý tự động.

### Quick Replies (DEPRECATED)

```http
GET /api/chatbot/quick-replies/:userId
GET /api/chatbot/anonymous/quick-replies
POST /api/chatbot/quick-replies/:userId
```

**⚠️ Lý do deprecated:**
- AI giờ hiểu tự nhiên, không cần quick-replies cứng
- Có thể hỏi bất kỳ câu gì, AI sẽ xử lý
- Quick replies giờ chỉ là suggestions, không bắt buộc

**Recommendation:**
- FE có thể giữ quick-reply UI cho UX
- Nhưng nên cho phép user gõ tự do
- Không cần gọi API quick-replies, chỉ cần gửi text message

---

## 💡 AI Capabilities (Khả năng của AI)

### 1. Câu hỏi chung (Không cần đăng nhập)

AI có thể trả lời:
- ✅ "Gym có những gói membership nào?"
- ✅ "Gym mở cửa lúc mấy giờ?"
- ✅ "Có bao nhiêu cơ sở gym?"
- ✅ "Gym có lớp yoga không?"
- ✅ "Trainer boxing tên gì?"
- ✅ "Gym có thiết bị gì?"
- ✅ "Giá gói Premium bao nhiêu?"

### 2. Câu hỏi cá nhân (Cần đăng nhập)

AI có thể trả lời khi có userId:
- ✅ "Gói tập của tôi còn bao nhiêu ngày?"
- ✅ "Lịch tập của tôi hôm nay"
- ✅ "Lịch của tôi tuần này"
- ✅ "Tôi đã đăng ký lớp nào?"
- ✅ "Gói tập của tôi hết hạn khi nào?"

Nếu user CHƯA đăng nhập mà hỏi câu cá nhân:
```
AI Response: "Để xem gói tập của bạn, bạn cần đăng nhập nhé! 🔐
Sau khi đăng nhập, tôi sẽ hiển thị chi tiết gói membership, ngày hết hạn,
và quyền lợi. Hoặc bạn muốn xem các gói membership hiện có không?"
```

### 3. Context-Aware (Nhớ ngữ cảnh)

AI nhớ 10 messages gần nhất:
```
User: "Gym có lớp nào?"
AI: "Có lớp yoga, boxing, dance..."

User: "Lớp yoga học thứ mấy?"
AI: [Nhớ đang nói về yoga] "Lớp yoga học thứ 2, 4, 6 lúc 6PM..."

User: "Giá bao nhiêu?"
AI: [Nhớ đang nói về lớp yoga] "Lớp yoga giá 500,000đ/tháng..."
```

### 4. Off-Topic Handling (Câu hỏi ngoài phạm vi)

AI LUÔN trả lời và lái về gym:
```
User: "Thời tiết hôm nay thế nào?"
AI: "Hôm nay trời nắng đẹp đấy! ☀️ Thời tiết tốt là cơ hội tuyệt vời
để đến gym tập luyện tăng năng lượng. Bạn muốn biết về các gói
membership hoặc lớp học hôm nay không?"

User: "Cách nấu phở?"
AI: "Phở cần xương hầm 3-4 tiếng cho nước dùng đậm đà! 🍜 Nhân tiện,
sau khi ăn phở thì rất cần tập gym để đốt calo và duy trì vóc dáng.
Bạn muốn tìm hiểu về lớp cardio hoặc boxing không?"
```

---

## 🔧 FE Implementation Guide

### 1. Chat Component Structure

```typescript
interface ChatMessage {
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
}

interface ChatState {
  messages: ChatMessage[];
  conversationId: string | null;
  anonymousId: string | null; // Only for anonymous users
  isLoading: boolean;
  userId: string | null; // From auth context
}
```

### 2. Send Message Function

```typescript
async function sendMessage(message: string) {
  const isAuthenticated = !!userId;

  // Add user message to UI immediately
  addMessage({ type: 'user', content: message, timestamp: new Date().toISOString() });

  setIsLoading(true);

  try {
    const endpoint = isAuthenticated
      ? `/api/chatbot/message/${userId}`
      : '/api/chatbot/anonymous/message';

    const body = isAuthenticated
      ? { message }
      : { message, anonymousId };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.success) {
      // Add bot response to UI
      addMessage({
        type: 'bot',
        content: data.response.content,
        timestamp: data.timestamp
      });

      // Save conversation ID
      setConversationId(data.conversationId);

      // Save anonymous ID if not authenticated
      if (!isAuthenticated && data.anonymousId) {
        setAnonymousId(data.anonymousId);
        localStorage.setItem('anonymousId', data.anonymousId);
      }
    } else {
      // Handle error
      addMessage({
        type: 'bot',
        content: data.response.content || 'Lỗi hệ thống, vui lòng thử lại',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    addMessage({
      type: 'bot',
      content: 'Không thể kết nối với server. Vui lòng thử lại sau.',
      timestamp: new Date().toISOString()
    });
  } finally {
    setIsLoading(false);
  }
}
```

### 3. Link Anonymous Conversation After Login

```typescript
async function linkAnonymousConversation(userId: string, anonymousId: string) {
  try {
    const response = await fetch(`/api/chatbot/link-anonymous/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymousId })
    });

    const data = await response.json();

    if (data.success) {
      console.log('Conversation linked successfully');
      // Clear anonymous ID from localStorage
      localStorage.removeItem('anonymousId');
      // Reload conversation with user context
      loadConversationHistory(userId);
    }
  } catch (error) {
    console.error('Link conversation error:', error);
  }
}
```

### 4. Load Conversation History

```typescript
async function loadConversationHistory(userId: string) {
  try {
    const response = await fetch(`/api/chatbot/conversation/${userId}`);
    const data = await response.json();

    if (data.success && data.conversation) {
      setMessages(data.conversation.messages);
      setConversationId(data.conversation._id);
    }
  } catch (error) {
    console.error('Load conversation error:', error);
  }
}
```

### 5. Initial Setup (Component Mount)

```typescript
useEffect(() => {
  // Check if user is authenticated
  if (userId) {
    // Load conversation history for authenticated user
    loadConversationHistory(userId);
  } else {
    // Load anonymous ID from localStorage
    const savedAnonymousId = localStorage.getItem('anonymousId');
    if (savedAnonymousId) {
      setAnonymousId(savedAnonymousId);
      // Optionally load anonymous conversation
      loadAnonymousConversation(savedAnonymousId);
    }
  }
}, [userId]);
```

### 6. Handle Login Event

```typescript
// When user logs in
function handleLogin(newUserId: string) {
  setUserId(newUserId);

  // Link anonymous conversation if exists
  const savedAnonymousId = localStorage.getItem('anonymousId');
  if (savedAnonymousId) {
    linkAnonymousConversation(newUserId, savedAnonymousId);
  } else {
    // Just load user's conversation history
    loadConversationHistory(newUserId);
  }
}
```

---

## 🎨 UI/UX Recommendations

### 1. Quick Replies (Optional)

Có thể hiển thị suggestions nhưng KHÔNG bắt buộc:

```tsx
const suggestions = [
  "Gym có gói nào?",
  "Giờ mở cửa",
  "Lớp học",
  "Trainer",
  // For authenticated users
  isAuthenticated && "Gói tập của tôi",
  isAuthenticated && "Lịch của tôi"
].filter(Boolean);

<div className="suggestions">
  {suggestions.map(text => (
    <button key={text} onClick={() => sendMessage(text)}>
      {text}
    </button>
  ))}
</div>
```

### 2. Loading States

```tsx
{isLoading && (
  <div className="bot-message loading">
    <div className="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  </div>
)}
```

### 3. Message Formatting

AI response có thể chứa:
- Emoji: 💪 🏋️ 🧘 📅 ⏰ 📞 ✅
- Bullet points: `•`
- Sections: `📦 Thông tin gói:`
- Line breaks: `\n`

→ Cần preserve formatting khi render

```tsx
<div className="bot-message">
  {message.content.split('\n').map((line, i) => (
    <p key={i}>{line}</p>
  ))}
</div>
```

### 4. Authentication Prompt

Khi AI response chứa login requirement:

```tsx
if (message.content.includes('đăng nhập') || message.content.includes('🔐')) {
  // Show login button prominently
  return (
    <div className="bot-message with-action">
      <p>{message.content}</p>
      <button onClick={handleLogin} className="login-btn">
        Đăng nhập ngay
      </button>
    </div>
  );
}
```

---

## 🐛 Error Handling

### Error Response Format

```json
{
  "success": false,
  "response": {
    "content": "Xin lỗi, hệ thống AI đang gặp sự cố. Vui lòng thử lại sau!\n\n📞 Hotline hỗ trợ: 1900-1234",
    "type": "system_error"
  },
  "error": "API key not configured"
}
```

### Common Error Scenarios

1. **API Key Error:** "Hệ thống AI chưa được cấu hình..."
2. **Rate Limit:** "Hệ thống đang quá tải. Vui lòng thử lại sau..."
3. **Network Error:** "Không thể kết nối với server..."
4. **Validation Error:** "Tin nhắn không hợp lệ"

### FE Error Handling

```typescript
if (!data.success) {
  // Display error message from API
  addMessage({
    type: 'bot',
    content: data.response?.content || 'Đã có lỗi xảy ra',
    timestamp: new Date().toISOString(),
    isError: true // Mark as error for styling
  });
}
```

---

## 📊 Example Conversations

### Example 1: Anonymous User - General Questions

```
User: "Gym có gói nào?"
Bot: "THE GYM có 3 gói membership:

💪 Gói Basic - 500,000đ/tháng
• Tập tại 1 cơ sở
• Không giới hạn thời gian tập

⭐ Gói Premium - 1,500,000đ/3 tháng
• Tập tại tất cả cơ sở
• Tham gia lớp nhóm miễn phí

👑 Gói VIP - 3,000,000đ/6 tháng
• Tất cả quyền lợi Premium
• PT cá nhân 2 buổi/tháng

Bạn quan tâm gói nào ạ?"

User: "Gói Premium có lớp nào?"
Bot: [Remembers context] "Với gói Premium, bạn được tham gia TẤT CẢ lớp nhóm miễn phí:

🧘 Yoga - Thứ 2, 4, 6 lúc 18:00
🥊 Boxing - Thứ 3, 5, 7 lúc 19:00
💃 Dance - Thứ 4, 6 lúc 17:00

Bạn muốn đăng ký gói Premium không?"
```

### Example 2: Anonymous User Asking Personal Question

```
User: "Gói tập của tôi còn bao nhiêu ngày?"
Bot: "Để xem gói tập của bạn, bạn cần đăng nhập nhé! 🔐

Sau khi đăng nhập, tôi sẽ hiển thị:
• Chi tiết gói membership hiện tại
• Ngày hết hạn và số ngày còn lại
• Quyền lợi và dịch vụ của gói

Hoặc bạn muốn xem các gói membership hiện có không?"
```

### Example 3: Authenticated User - Personal Questions

```
User: "Gói tập của tôi"
Bot: "Chào Nguyễn Văn A! 👋

📦 THÔNG TIN GÓI MEMBERSHIP

• Gói: Premium (3 tháng)
• Giá: 1,500,000đ
• Trạng thái: Đang hoạt động ✅
• Ngày hết hạn: 05/01/2026
• Còn lại: 25 ngày

🎯 Quyền lợi:
• Tập tại tất cả cơ sở
• Tham gia lớp nhóm miễn phí
• Đặt lịch với trainer

💡 Bạn có muốn gia hạn sớm để nhận ưu đãi không?"

User: "Lịch tập của tôi tuần này"
Bot: "📅 LỊCH TẬP 7 NGÀY TỚI

Hôm nay (10/12):
1. 16:00 - 17:00
   🎯 Tập cá nhân
   👨‍💪 PT Minh
   📍 Elite Fitness Q1

Thứ 4 (12/12):
1. 18:00 - 19:00
   🧘 Lớp Yoga cơ bản
   📍 Elite Fitness Q1

Thứ 6 (14/12):
1. 19:00 - 20:00
   🥊 Lớp Boxing
   📍 Elite Fitness Q3

📊 Tổng kết:
• Tổng số buổi: 3
• Tập với trainer: 1 buổi
• Lớp nhóm: 2 buổi

Chúc bạn tập luyện hiệu quả! 💪"
```

### Example 4: Off-Topic Question

```
User: "Thời tiết hôm nay thế nào?"
Bot: "Hôm nay trời nắng đẹp đấy! ☀️ Thời tiết tốt là cơ hội tuyệt vời để đến gym tập luyện tăng năng lượng. Bạn muốn biết về các gói membership hoặc lớp học hôm nay không?"

User: "Cách nấu phở?"
Bot: "Phở cần xương hầm 3-4 tiếng cho nước dùng đậm đà! 🍜 Nhân tiện, sau khi ăn phở thì rất cần tập gym để đốt calo và duy trì vóc dáng. Bạn muốn tìm hiểu về lớp cardio hoặc boxing không?"
```

---

## 🔒 Security Notes

1. **Rate Limiting:**
   - Anonymous: 10 requests/minute
   - Authenticated: 20 requests/minute

2. **Message Validation:**
   - Min length: 1 character
   - Max length: 1000 characters
   - No XSS patterns allowed

3. **User Context:**
   - User chỉ access được conversation của mình
   - Personal data chỉ return khi có userId hợp lệ

---

## 🚀 Migration Guide (For Existing FE)

### Changes Required:

1. **Remove hardcoded quick-reply logic**
   - Quick replies giờ là optional suggestions
   - User có thể gõ tự do bất kỳ câu gì

2. **Update message handling**
   - Response format đã thay đổi
   - `response.content` thay vì `response.content` với metadata phức tạp

3. **Handle longer responses**
   - AI responses có thể dài hơn (multi-paragraph)
   - Cần scroll và format tốt

4. **Update error handling**
   - Error messages thân thiện hơn
   - Luôn có hướng dẫn user làm gì tiếp theo

5. **Test authentication flow**
   - Test link anonymous conversation
   - Test personal queries require login

---

## 📞 Support

Có vấn đề với API? Contact backend team:
- Tech lead: [Your contact]
- API issues: Check logs hoặc health endpoint
- Gemini API key: Đảm bảo có trong .env

---

**Version:** 2.0
**Last Updated:** 2025-12-10
**Status:** ✅ Production Ready
