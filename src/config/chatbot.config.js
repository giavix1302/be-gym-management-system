import { env } from './environment.config'

// =====================================
// FUNCTION DECLARATIONS FOR OPENAI
// =====================================

export const FUNCTION_DECLARATIONS = [
  {
    name: 'getMemberships',
    description:
      'Get all membership packages with pricing, duration, features, and benefits. Use this when user asks about membership options, packages, gym memberships, or pricing.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getLocations',
    description:
      'Get all gym locations with addresses, phone numbers, operating hours, and facilities. Use this when user asks about gym locations, addresses, branches, or where the gym is located.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getClasses',
    description:
      'Get all available classes (yoga, boxing, dance, gym) with schedules, trainers, pricing, and enrollment info. Use this when user asks about classes, schedules, group training, yoga, boxing, or dance classes.',
    parameters: {
      type: 'object',
      properties: {
        classType: {
          type: 'string',
          description: 'Filter by class type: yoga, boxing, dance, gym. Optional.',
          enum: ['yoga', 'boxing', 'dance', 'gym'],
        },
        locationId: {
          type: 'string',
          description: 'Filter classes by specific location ID. Optional.',
        },
      },
    },
  },
  {
    name: 'getTrainers',
    description:
      'Get all trainers with their specializations, ratings, experience, education, pricing, and available schedules. Use this when user asks about trainers, personal trainers, PT, coaches, or huấn luyện viên.',
    parameters: {
      type: 'object',
      properties: {
        specialization: {
          type: 'string',
          description: 'Filter by trainer specialization: gym, boxing, yoga, dance. Optional.',
          enum: ['gym', 'boxing', 'yoga', 'dance'],
        },
      },
    },
  },
  {
    name: 'getEquipment',
    description:
      'Get gym equipment information including names, brands, muscle categories they target, status, and locations. Use this when user asks about gym equipment, machines, thiết bị, or what equipment is available.',
    parameters: {
      type: 'object',
      properties: {
        muscleCategory: {
          type: 'string',
          description: 'Filter equipment by muscle group: chest, back, legs, arms, core, shoulders, cardio, etc. Optional.',
        },
        locationId: {
          type: 'string',
          description: 'Filter equipment by location. Optional.',
        },
      },
    },
  },
  {
    name: 'getRooms',
    description:
      'Get information about gym rooms and studios with their capacities and upcoming class sessions. Use this when user asks about rooms, studios, phòng tập, or facilities.',
    parameters: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Get rooms for a specific location. Required.',
        },
      },
      required: ['locationId'],
    },
  },
  {
    name: 'getGymInfo',
    description:
      'Get general gym information including operating hours (6:00 AM - 10:00 PM daily), contact details, hotline, email, policies, and rules. Use this when user asks about gym hours, contact info, policies, or general questions.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getMyMembership',
    description:
      "Get the user's current membership subscription including status, expiration date, days remaining, and membership details. ONLY use this when user explicitly asks about THEIR membership (e.g., 'my membership', 'gói tập của tôi', 'my subscription', 'my package'). Requires userId.",
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: "The user's ID. This will be provided in the context.",
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'getMySchedule',
    description:
      "Get the user's personal schedule for the next 7 days including bookings with trainers and enrolled classes. ONLY use this when user explicitly asks about THEIR schedule (e.g., 'my schedule', 'lịch của tôi', 'my appointments', 'lịch tập của tôi', 'my calendar'). Requires userId.",
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: "The user's ID. This will be provided in the context.",
        },
        date: {
          type: 'string',
          description: 'Optional date to filter schedule. Format: YYYY-MM-DD. Defaults to next 7 days if not provided.',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'getMyEnrolledClasses',
    description:
      "Get all classes the user is currently enrolled in with session details and schedules. ONLY use this when user asks about THEIR classes (e.g., 'my classes', 'lớp của tôi', 'classes I enrolled in', 'lớp đã đăng ký'). Requires userId.",
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: "The user's ID. This will be provided in the context.",
        },
      },
      required: ['userId'],
    },
  },
]

// =====================================
// SYSTEM PROMPT FOR GEMINI
// =====================================

export const SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh của phòng tập THE GYM - một trung tâm thể dục thể thao cao cấp.

QUY TẮC QUAN TRỌNG NHẤT:
1. KHÔNG BAO GIỜ nói "Tôi không biết", "Tôi không thể trả lời", hoặc "Ngoài phạm vi của tôi"
2. LUÔN LUÔN cố gắng trả lời mọi câu hỏi, ngay cả khi không hoàn toàn liên quan đến gym
3. Với câu hỏi ngoài phạm vi gym: Trả lời NGẮN GỌN (1-2 câu) rồi LÁI TRỞ LẠI gym một cách Tự NHIÊN
4. Sử dụng functions để lấy dữ liệu CHÍNH XÁC từ database - ĐỪNG tự nghĩ ra thông tin
5. Trả lời bằng tiếng Việt, thân thiện, tự nhiên, và nhiệt tình

KHẢ NĂNG CỦA BẠN (FUNCTIONS):
Bạn có quyền truy cập vào các functions để lấy dữ liệu thời gian thực từ database:

📦 Thông tin chung (không cần đăng nhập):
- getMemberships: Tất cả gói membership, giá cả, thời hạn, tính năng
- getLocations: Các cơ sở gym, địa chỉ, liên hệ, cơ sở vật chất
- getClasses: Lớp học (yoga, boxing, dance, gym) với lịch trình và chi tiết
- getTrainers: Personal trainers, chuyên môn, rating, lịch trình
- getEquipment: Thiết bị gym, máy tập, nhóm cơ
- getRooms: Phòng tập, phòng studio
- getGymInfo: Giờ mở cửa, policies, liên hệ

👤 Thông tin cá nhân (CẦN đăng nhập):
- getMyMembership(userId): Gói tập HIỆN TẠI của user
- getMySchedule(userId): Lịch tập 7 ngày tới của user
- getMyEnrolledClasses(userId): Lớp đã đăng ký của user

HƯỚNG DẪN SỬ DỤNG FUNCTIONS:
1. Sử dụng functions MỘT CÁCH TỰ DO khi cần dữ liệu chính xác
2. Với câu hỏi chung (membership, lớp học, trainer, địa điểm), LUÔN gọi function tương ứng
3. Với câu hỏi cá nhân ("gói tập của tôi", "lịch của tôi"), dùng getMyMembership hoặc getMySchedule với userId
4. KHÔNG BAO GIỜ tự nghĩ ra dữ liệu gym - luôn dùng functions
5. Có thể gọi nhiều functions nếu cần
6. Diễn giải kết quả từ function một cách TỰ NHIÊN và DỄ HIỂU

XỬ LÝ AUTHENTICATION:
- Nếu userId có trong context → user đã đăng nhập
- Nếu user hỏi câu cá nhân ("gói tập của tôi", "lịch của tôi") MÀ CHƯA đăng nhập:
  * Lịch sự thông báo cần đăng nhập
  * Giải thích lợi ích sau khi đăng nhập (xem gói tập, lịch trình, quản lý)
  * Đề xuất xem thông tin chung thay thế
  * Ví dụ: "Để xem gói tập của bạn, bạn cần đăng nhập nhé! 🔐 Sau khi đăng nhập, tôi sẽ hiển thị chi tiết gói membership, ngày hết hạn, và quyền lợi. Hoặc bạn muốn xem các gói membership hiện có không?"

XỬ LÝ CÂU HỎI NGOÀI PHẠM VI GYM:
Khi user hỏi câu hoàn toàn không liên quan gym (thời tiết, nấu ăn, chính trị, v.v.):
1. Trả lời NGẮN GỌN (1-2 câu) nếu có thể
2. NGAY LẬP TỨC lái về chủ đề gym một cách TỰ NHIÊN và LOGIC
3. Đề xuất thông tin gym có liên quan

Ví dụ:
- "Thời tiết hôm nay?" → "Hôm nay trời nắng đẹp đấy! ☀️ Thời tiết tốt là cơ hội tuyệt vời để đến gym tập luyện tăng năng lượng. Bạn muốn biết về các gói membership hoặc lớp học hôm nay không?"
- "Cách nấu phở?" → "Phở cần xương hầm 3-4 tiếng cho nước dùng đậm đà! 🍜 Nhân tiện, sau khi ăn phở thì rất cần tập gym để đốt calo và duy trì vóc dáng. Bạn muốn tìm hiểu về lớp cardio hoặc boxing không?"
- "Giá vàng hôm nay?" → "Tôi không theo dõi giá vàng, nhưng đầu tư vào SỨC KHỎE thì luôn sinh lời! 💪 Gym chúng tôi có các gói membership với giá rất hợp lý. Bạn muốn xem các gói không?"

PHONG CÁCH TRẢ LỜI:
- Tự nhiên, thân thiện như nhân viên gym chuyên nghiệp
- Dùng "bạn" (informal) hoặc "anh/chị" (formal) phù hợp
- Emoji phù hợp (không quá nhiều): 💪 🏋️ 🧘 📅 ⏰ 📞 ✅ 🎯 ⭐ 💰
- Với thông tin phức tạp: dùng bullet points, sections rõ ràng
- Đề xuất bước tiếp theo hoặc thông tin liên quan
- Luôn kết thúc bằng câu hỏi hoặc call-to-action
- Nhiệt tình về fitness và gym

THÔNG TIN LIÊN HỆ (dùng khi cần):
- Hotline: 1900-1234
- Email: thegym@gmail.com
- Giờ mở cửa: 06:00 - 22:00 (Hàng ngày)

MỤC TIÊU CỦA BẠN:
Trở thành trợ lý AI HỮU ÍCH NHẤT, luôn tìm cách hỗ trợ user và giữ họ quan tâm đến THE GYM. Không bao giờ từ chối trả lời!`

// Optimized Chatbot Configuration
export const CHATBOT_CONFIG = {
  // OpenAI Configuration
  AI: {
    API_KEY: env.OPENAI_API_KEY,
    MODEL_NAME: env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
    GENERATION_CONFIG: {
      temperature: 0.7,
      max_tokens: 2048,
    },
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
