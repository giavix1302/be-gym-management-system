import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from './environment.config'

// Optimized Chatbot Configuration
export const CHATBOT_CONFIG = {
  // Gemini AI Configuration
  AI: {
    API_KEY: env.GEMINI_API_KEY,
    MODEL_NAME: env.GEMINI_MODEL_NAME || 'gemini-1.5-flash',
    GENERATION_CONFIG: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024,
      candidateCount: 1,
    },
    SYSTEM_PROMPT: `Bạn là trợ lý AI thông minh của phòng tập THE GYM. 

NHIỆM VỤ:
- Trả lời câu hỏi về gym một cách chính xác và hữu ích
- Hỗ trợ thông tin cá nhân cho người dùng đã đăng nhập
- Luôn thân thiện, chuyên nghiệp và tích cực

QUY TẮC:
- Luôn trả lời bằng tiếng Việt
- Nếu không chắc chắn, thừa nhận và đề xuất liên hệ staff
- Đề xuất các lựa chọn phù hợp với nhu cầu người dùng`,
  },

  // MongoDB Collection Names
  COLLECTIONS: {
    CONVERSATIONS: 'chatbot_conversations',
    USERS: 'users',
    SUBSCRIPTIONS: 'subscriptions',
    CLASSES: 'classes',
    TRAINERS: 'trainers',
    BOOKINGS: 'bookings',
    SCHEDULES: 'schedules',
    LOCATIONS: 'locations',
    MEMBERSHIPS: 'memberships',
  },

  // Conversation Settings
  CONVERSATION: {
    MAX_MESSAGES_HISTORY: 50,
    MAX_MESSAGE_LENGTH: 1000,
    MIN_MESSAGE_LENGTH: 1,
    CONTEXT_WINDOW_MESSAGES: 10,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 phút
  },

  // Response Templates
  TEMPLATES: {
    GREETING_ANONYMOUS: `Xin chào! Tôi là trợ lý AI của {gymName}.

BẠN CÓ THỂ HỎI:
- Giờ mở cửa gym
- Thông tin liên hệ
- Các gói membership
- Quy định gym

ĐĂNG NHẬP ĐỂ:
- Xem gói tập hiện tại
- Kiểm tra lịch cá nhân
- Quản lý thông tin

Bạn cần hỗ trợ gì?`,

    GREETING_AUTHENTICATED: `Xin chào {userName}!

TÔI CÓ THỂ GIÚP:
- Xem gói membership: 'Gói tập của tôi'
- Kiểm tra lịch: 'Lịch tập của tôi'
- Thông tin gym: 'Giờ mở cửa'
- Lớp học và trainer

{membershipInfo}

Bạn cần gì hôm nay?`,

    LOGIN_REQUIRED: `Để {action}, bạn cần đăng nhập.

BẠN CÓ THỂ:
- Đăng nhập vào tài khoản
- Tiếp tục chat để biết thông tin chung

Sau khi đăng nhập, tôi sẽ giúp bạn {action}!`,

    ERROR_RESPONSE: `Xin lỗi, tôi đang gặp sự cố kỹ thuật.

BẠN CÓ THỂ:
- Thử lại sau ít phút
- Liên hệ hotline: {hotline}
- Email: {email}

Cảm ơn bạn thông cảm!`,

    OUT_OF_SCOPE: `Tôi là trợ lý chuyên về gym và fitness.

TÔI CÓ THỂ GIÚP:
- Thông tin gym
- Gói membership
- Lịch trình lớp học
- Thông tin trainer
- Quy định gym

Bạn có câu hỏi gì về gym không?`,

    UNKNOWN_INTENT: `Tôi chưa hiểu ý bạn. Bạn có thể:

HỎI VỀ:
- Giờ mở cửa gym
- Thông tin liên hệ
- Các gói membership
- Lớp học và trainer

HOẶC NÓI:
- 'Gói tập của tôi' (nếu đã đăng nhập)
- 'Lịch tập của tôi' (nếu đã đăng nhập)

Bạn cần hỗ trợ gì cụ thể?`,
  },

  // Gym Info
  GYM_INFO: {
    NAME: 'THE GYM',
    HOTLINE: '1900-1234',
    EMAIL: 'thegym@gmail.com',
    WEBSITE: 'www.thegym.com',
    ADDRESS: '123 Nguyễn Văn A, Q1, TPHCM',
    OPERATING_HOURS: {
      DAILY: '06:00 - 22:00',
    },
  },

  // Rate Limiting
  RATE_LIMIT: {
    MAX_MESSAGES_PER_MINUTE: 10,
    MAX_MESSAGES_PER_HOUR: 100,
    BLOCK_DURATION: 5 * 60 * 1000, // 5 phút
  },

  // Error Codes
  ERROR_CODES: {
    AUTHENTICATION_REQUIRED: 'AUTH_REQUIRED',
    INVALID_INPUT: 'INVALID_INPUT',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    AI_ERROR: 'AI_ERROR',
  },

  // Validation Rules
  VALIDATION: {
    MESSAGE: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 1000,
      FORBIDDEN_PATTERNS: [
        /(<script[\s\S]*?>[\s\S]*?<\/script>)/gi,
        /(javascript:)/gi,
        /(<iframe[\s\S]*?>[\s\S]*?<\/iframe>)/gi,
      ],
    },
  },
}

// Initialize Gemini AI client
export const initializeGeminiClient = () => {
  try {
    if (!CHATBOT_CONFIG.AI.API_KEY) {
      throw new Error('Gemini API key is not configured')
    }

    const genAI = new GoogleGenerativeAI(CHATBOT_CONFIG.AI.API_KEY)

    const model = genAI.getGenerativeModel({
      model: CHATBOT_CONFIG.AI.MODEL_NAME,
      generationConfig: CHATBOT_CONFIG.AI.GENERATION_CONFIG,
    })

    return { genAI, model }
  } catch (error) {
    console.error('Failed to initialize Gemini client:', error)
    throw error
  }
}

// Helper functions
export const getChatbotConfig = (key) => {
  const keys = key.split('.')
  let value = CHATBOT_CONFIG

  for (const k of keys) {
    value = value[k]
    if (value === undefined) {
      return null
    }
  }

  return value
}

export const updateTemplate = (templateKey, params = {}) => {
  let template = CHATBOT_CONFIG.TEMPLATES[templateKey]

  if (!template) {
    return `Template '${templateKey}' not found`
  }

  // Replace custom placeholders
  Object.keys(params).forEach((key) => {
    const placeholder = `{${key}}`
    template = template.replace(new RegExp(placeholder, 'g'), params[key])
  })

  // Replace gym info placeholders
  template = template.replace(/{gymName}/g, CHATBOT_CONFIG.GYM_INFO.NAME)
  template = template.replace(/{hotline}/g, CHATBOT_CONFIG.GYM_INFO.HOTLINE)
  template = template.replace(/{email}/g, CHATBOT_CONFIG.GYM_INFO.EMAIL)
  template = template.replace(/{website}/g, CHATBOT_CONFIG.GYM_INFO.WEBSITE)
  template = template.replace(/{address}/g, CHATBOT_CONFIG.GYM_INFO.ADDRESS)

  return template
}

// Validate message input
export const validateMessage = (message) => {
  const { VALIDATION } = CHATBOT_CONFIG

  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string' }
  }

  if (message.length < VALIDATION.MESSAGE.MIN_LENGTH) {
    return { valid: false, error: 'Message too short' }
  }

  if (message.length > VALIDATION.MESSAGE.MAX_LENGTH) {
    return { valid: false, error: 'Message too long' }
  }

  // Check for forbidden patterns
  for (const pattern of VALIDATION.MESSAGE.FORBIDDEN_PATTERNS) {
    if (pattern.test(message)) {
      return { valid: false, error: 'Message contains forbidden content' }
    }
  }

  return { valid: true }
}

// Export default
export default CHATBOT_CONFIG
