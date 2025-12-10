# Migration: Gemini → OpenAI

## Tổng quan
Đã chuyển đổi hoàn toàn từ **Google Gemini AI** sang **OpenAI GPT** cho hệ thống chatbot.

---

## Thay đổi chính

### 1. **Dependencies**
```bash
# Đã gỡ
- @google/generative-ai

# Đã cài
+ openai
```

### 2. **Environment Variables (.env)**
```env
# Không dùng nữa (có thể xóa)
GEMINI_API_KEY=...
GEMINI_MODEL_NAME=...

# Đang sử dụng
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL_NAME=gpt-4o-mini
```

### 3. **Files đã thay đổi**

#### ✅ `src/config/environment.config.js`
```diff
- GEMINI_API_KEY: process.env.GEMINI_API_KEY,
- GEMINI_MODEL_NAME: process.env.GEMINI_MODEL_NAME,
+ OPENAI_API_KEY: process.env.OPENAI_API_KEY,
+ OPENAI_MODEL_NAME: process.env.OPENAI_MODEL_NAME,
```

#### ✅ `src/config/chatbot.config.js`
```diff
- import { GoogleGenerativeAI } from '@google/generative-ai'
- // FUNCTION DECLARATIONS FOR GEMINI
+ // FUNCTION DECLARATIONS FOR OPENAI

AI: {
-   API_KEY: env.GEMINI_API_KEY,
-   MODEL_NAME: env.GEMINI_MODEL_NAME || 'gemini-1.5-pro',
+   API_KEY: env.OPENAI_API_KEY,
+   MODEL_NAME: env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
    GENERATION_CONFIG: {
      temperature: 0.7,
-     topP: 0.9,
-     topK: 40,
-     maxOutputTokens: 2048,
+     max_tokens: 2048,
    }
}
```

#### ✅ `src/modules/chatbot/service/chatbot.service.js`
```diff
- // AI-Powered Chatbot with Gemini Function Calling
- import { handleFunctionCallingFlow } from './gemini.service.js'
+ // AI-Powered Chatbot with OpenAI Function Calling
+ import { handleFunctionCallingFlow } from './openai.service.js'

- console.log('🤖 Calling Gemini AI...')
+ console.log('🤖 Calling OpenAI...')
```

#### ✅ `src/modules/chatbot/controller/chatbot.controller.js`
```diff
- version: '2.0 - Gemini Function Calling',
+ version: '2.0 - OpenAI Function Calling',
```

#### 🆕 `src/modules/chatbot/service/openai.service.js` (NEW FILE)
File mới thay thế `gemini.service.js` với các tính năng:
- Function calling với OpenAI
- Context management (10 messages gần nhất)
- Error handling
- Health check

---

## API Models

### OpenAI Models được hỗ trợ:
| Model | Use Case | Cost |
|-------|----------|------|
| `gpt-4o-mini` | **Recommended** - Fast, cheap, good quality | Lowest |
| `gpt-4o` | Best quality, slower | Medium |
| `gpt-4-turbo` | High quality | High |
| `gpt-3.5-turbo` | Fastest, cheapest (legacy) | Lowest |

**Hiện tại đang dùng:** `gpt-4o-mini`

---

## Sự khác biệt giữa Gemini và OpenAI

### 1. **Message Format**
```javascript
// Gemini
{
  role: 'user' | 'model',
  parts: [{ text: '...' }]
}

// OpenAI
{
  role: 'user' | 'assistant' | 'system',
  content: '...'
}
```

### 2. **Function Calling Format**
```javascript
// Gemini
tools: [{
  functionDeclarations: [{ name, description, parameters }]
}]

// OpenAI
tools: [{
  type: 'function',
  function: { name, description, parameters }
}]
```

### 3. **Function Response**
```javascript
// Gemini
response.functionCalls → array of function calls
Send back: [{ functionResponse: { name, response } }]

// OpenAI
message.tool_calls → array of tool calls
Send back: { role: 'tool', tool_call_id, content }
```

### 4. **Context Management**
```javascript
// Gemini
model.startChat({ history: [...messages] })

// OpenAI
client.chat.completions.create({
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage }
  ]
})
```

---

## Testing

### Test chatbot:
```bash
# Anonymous message
POST http://localhost:3000/api/chatbot/anonymous/message
{
  "message": "Gym có gói nào?"
}

# Authenticated message
POST http://localhost:3000/api/chatbot/message/USER_ID
{
  "message": "Gói tập của tôi"
}

# Health check
GET http://localhost:3000/api/chatbot/health
```

### Expected response:
```json
{
  "success": true,
  "response": {
    "content": "THE GYM có 3 gói membership:\n\n💪 Gói Basic...",
    "type": "ai_response"
  },
  "conversationId": "...",
  "timestamp": "..."
}
```

---

## Troubleshooting

### Error: "Invalid API key"
```bash
# Kiểm tra .env
OPENAI_API_KEY=sk-proj-...  # Phải bắt đầu với sk-proj- hoặc sk-
```

### Error: "Model not found"
```bash
# Sửa model name trong .env
OPENAI_MODEL_NAME=gpt-4o-mini  # Hoặc gpt-4o, gpt-4-turbo
```

### Error: "Rate limit exceeded"
OpenAI free tier có giới hạn:
- 3 requests/minute (RPM)
- 200 requests/day (RPD)

**Giải pháp:**
1. Upgrade OpenAI account
2. Hoặc thêm retry logic với exponential backoff
3. Hoặc giảm tần suất test

---

## Cost Comparison

### Gemini API (Free tier):
- ✅ 15 requests/minute
- ✅ 1,500 requests/day
- ✅ Free forever

### OpenAI API (Free tier):
- ⚠️ 3 requests/minute
- ⚠️ 200 requests/day
- ⚠️ $5 free credit (expires after 3 months)

### Recommendation:
Nếu bạn lo về cost:
1. Dùng `gpt-4o-mini` (rẻ nhất)
2. Implement caching để giảm API calls
3. Rate limit phía frontend
4. Hoặc quay lại Gemini (free hơn nhiều)

---

## Rollback Plan

Nếu muốn quay lại Gemini:

```bash
# 1. Cài lại Gemini package
npm install @google/generative-ai

# 2. Restore files từ backup hoặc git
git checkout HEAD~1 src/modules/chatbot/service/gemini.service.js
git checkout HEAD~1 src/modules/chatbot/service/chatbot.service.js
git checkout HEAD~1 src/config/chatbot.config.js
git checkout HEAD~1 src/config/environment.config.js

# 3. Update .env
GEMINI_API_KEY=...
GEMINI_MODEL_NAME=gemini-1.5-pro

# 4. Xóa openai.service.js
rm src/modules/chatbot/service/openai.service.js

# 5. Uninstall OpenAI
npm uninstall openai
```

---

## Completed ✅

- ✅ Installed OpenAI package
- ✅ Updated environment config
- ✅ Created openai.service.js
- ✅ Updated chatbot.service.js
- ✅ Updated chatbot.config.js
- ✅ Updated chatbot.controller.js
- ✅ Removed Google Generative AI package
- ✅ Updated default model to gpt-4o-mini

**Hệ thống chatbot giờ đang chạy hoàn toàn trên OpenAI!** 🎉
