// intent.classifier.js - Intent Classification với 2 levels (FIXED)

// FAQ vs ACTION Keywords - Updated with better specificity
const FAQ_KEYWORDS = {
  QUESTIONS: ['gì', 'nào', 'như thế nào', 'có', 'bao nhiêu', 'ở đâu', 'khi nào', 'tại sao', 'làm sao'],
  INFO_REQUESTS: ['thông tin', 'giới thiệu', 'chi tiết', 'danh sách', 'có những'],
  GENERAL: ['giờ mở cửa', 'liên hệ', 'địa chỉ', 'giá', 'phí', 'trainer', 'thiết bị'],
}

const ACTION_KEYWORDS = {
  REGISTER: ['đăng ký', 'tạo tài khoản', 'đăng ký tài khoản', 'dăng ký'], // Removed standalone 'mở'
  CANCEL: ['hủy', 'hủy bỏ', 'dừng', 'ngừng'],
  CHECK_PERSONAL: ['của tôi', 'tôi có', 'tài khoản tôi', 'gói tôi', 'lịch tôi'],
  BOOK: ['đặt', 'book', 'hẹn', 'thuê'],
  UPDATE: ['cập nhật', 'sửa', 'thay đổi', 'chỉnh'],
}

// Specific Intent Keywords with better phrases (Priority: Longer phrases first)
const SPECIFIC_KEYWORDS = {
  FAQ: {
    GREETING: ['xin chào', 'hello', 'hi', 'chào', 'hey'],
    OPERATING_HOURS: [
      'giờ mở cửa gym',
      'gym mở cửa',
      'giờ mở cửa',
      'mở cửa lúc mấy giờ',
      'thời gian mở cửa',
      'giờ hoạt động',
      'thời gian hoạt động',
      'mở cửa',
      'đóng cửa',
      'giờ làm việc',
    ],
    EQUIPMENT: ['thiết bị', 'máy tập', 'dụng cụ', 'tạ', 'cardio'],
    TRAINERS: ['trainer', 'huấn luyện viên', 'pt', 'personal trainer'],
    CLASSES: ['lớp học', 'class', 'yoga', 'aerobic', 'boxing'],
    MEMBERSHIP: ['gói tập', 'membership', 'phí', 'giá', 'chi phí'],
    CONTACT: ['liên hệ', 'số điện thoại', 'địa chỉ', 'email'],
    POLICIES: ['quy định', 'chính sách', 'policy', 'luật lệ'],
  },
  ACTIONS: {
    REGISTER_ACCOUNT: ['đăng ký tài khoản', 'tạo tài khoản', 'register account', 'sign up', 'tôi muốn đăng ký'],
    REGISTER_MEMBERSHIP: ['đăng ký gói', 'mua gói', 'đăng ký membership'],
    REGISTER_CLASS: ['đặt lịch', 'đăng ký lớp', 'book class', 'đăng ký học'],
    CANCEL_BOOKING: ['hủy lịch', 'cancel', 'hủy đăng ký', 'hủy booking'],
    CHECK_MEMBERSHIP: ['kiểm tra gói', 'xem gói', 'thông tin gói', 'membership của tôi'],
    CHECK_SCHEDULE: ['xem lịch', 'schedule', 'thời khóa biểu', 'lịch của tôi'],
    BOOK_TRAINER: ['đặt trainer', 'book pt', 'thuê trainer'],
    CONTACT_STAFF: ['liên hệ nhân viên', 'gọi staff', 'hỗ trợ'],
  },
}

// FAQ Exact Phrases - High priority FAQ patterns that should never be classified as ACTION
const FAQ_EXACT_PHRASES = [
  'giờ mở cửa',
  'gym mở cửa',
  'giờ mở cửa gym',
  'mở cửa lúc mấy giờ',
  'thời gian mở cửa',
  'giờ hoạt động',
  'thông tin liên hệ',
  'địa chỉ gym',
  'số điện thoại',
  'thiết bị gym',
  'máy tập',
  'trainer nào',
  'lớp học nào',
  'gói membership nào',
  'quy định gym',
]

// Main classification function
export const classifyIntent = (message) => {
  const messageLower = message.toLowerCase()

  // Level 1: Determine FAQ vs ACTION with improved logic
  const category = classifyCategory(messageLower)

  // Level 2: Determine specific intent
  const specificIntent = classifySpecificIntent(messageLower, category)

  // Calculate confidence
  const confidence = calculateConfidence(messageLower, category, specificIntent)

  return {
    category,
    specificIntent,
    confidence,
  }
}

// Level 1: FAQ vs ACTION classification - IMPROVED LOGIC
const classifyCategory = (message) => {
  // STEP 1: Check for explicit FAQ phrases first (highest priority)
  const hasExactFAQPhrase = FAQ_EXACT_PHRASES.some((phrase) => message.includes(phrase))
  if (hasExactFAQPhrase) {
    return 'FAQ'
  }

  // STEP 2: Check for specific FAQ keywords with exact matching
  const hasSpecificFAQKeyword = Object.values(SPECIFIC_KEYWORDS.FAQ).some((keywords) =>
    keywords.some((keyword) => {
      // For phrases, use exact match
      if (keyword.includes(' ')) {
        return message.includes(keyword)
      }
      // For single words, check word boundaries to avoid conflicts
      return new RegExp(`\\b${escapeRegex(keyword)}\\b`).test(message)
    })
  )

  if (hasSpecificFAQKeyword) {
    return 'FAQ'
  }

  // STEP 3: Check for question patterns
  const isQuestion = isQuestionPattern(message)
  if (isQuestion) {
    return 'FAQ'
  }

  // STEP 4: Check for general FAQ keywords
  const hasFAQKeyword = Object.values(FAQ_KEYWORDS).some((keywords) =>
    keywords.some((keyword) => message.includes(keyword))
  )

  if (hasFAQKeyword) {
    return 'FAQ'
  }

  // STEP 5: Check for personal queries (usually actions)
  const isPersonalQuery = ACTION_KEYWORDS.CHECK_PERSONAL.some((keyword) => message.includes(keyword))
  if (isPersonalQuery) {
    return 'ACTION'
  }

  // STEP 6: Check for action keywords with improved matching
  const hasActionKeyword = Object.values(ACTION_KEYWORDS).some((keywords) =>
    keywords.some((keyword) => {
      // For phrases, use exact match
      if (keyword.includes(' ')) {
        return message.includes(keyword)
      }
      // For single words, be more specific to avoid conflicts
      return new RegExp(`\\b${escapeRegex(keyword)}\\b`).test(message)
    })
  )

  if (hasActionKeyword) {
    return 'ACTION'
  }

  // Default to FAQ (safer for unknown intents)
  return 'FAQ'
}

// Level 2: Specific intent classification
const classifySpecificIntent = (message, category) => {
  if (category === 'FAQ') {
    return classifyFAQIntent(message)
  } else {
    return classifyActionIntent(message)
  }
}

const classifyFAQIntent = (message) => {
  // Check greeting first
  if (SPECIFIC_KEYWORDS.FAQ.GREETING.some((keyword) => message.includes(keyword))) {
    return 'greeting'
  }

  // Check specific FAQ categories with priority for longer phrases
  for (const [intentType, keywords] of Object.entries(SPECIFIC_KEYWORDS.FAQ)) {
    // Sort keywords by length (longer first) to prioritize specific phrases
    const sortedKeywords = keywords.sort((a, b) => b.length - a.length)

    if (sortedKeywords.some((keyword) => message.includes(keyword))) {
      return intentType.toLowerCase()
    }
  }

  return 'general_question'
}

const classifyActionIntent = (message) => {
  // Check specific action intents with priority for longer phrases
  for (const [intentType, keywords] of Object.entries(SPECIFIC_KEYWORDS.ACTIONS)) {
    // Sort keywords by length (longer first) to prioritize specific phrases
    const sortedKeywords = keywords.sort((a, b) => b.length - a.length)

    if (sortedKeywords.some((keyword) => message.includes(keyword))) {
      return intentType.toLowerCase()
    }
  }

  // Fallback based on action type with improved matching
  if (
    ACTION_KEYWORDS.REGISTER.some((keyword) => {
      if (keyword.includes(' ')) {
        return message.includes(keyword)
      }
      return new RegExp(`\\b${escapeRegex(keyword)}\\b`).test(message)
    })
  ) {
    return 'register_membership'
  }

  if (ACTION_KEYWORDS.CANCEL.some((keyword) => message.includes(keyword))) {
    return 'cancel_booking'
  }

  if (ACTION_KEYWORDS.BOOK.some((keyword) => message.includes(keyword))) {
    return 'book_trainer'
  }

  if (ACTION_KEYWORDS.CHECK_PERSONAL.some((keyword) => message.includes(keyword))) {
    return 'check_membership'
  }

  return 'general_action'
}

// Helper functions
const isQuestionPattern = (message) => {
  const questionPatterns = [
    /^(có|làm|như|gì|nào|đâu|khi|tại|bao)/,
    /(thế nào|như thế|ra sao)$/,
    /\?$/,
    /mấy giờ/,
    /ở đâu/,
    /như thế nào/,
  ]

  return questionPatterns.some((pattern) => pattern.test(message))
}

const calculateConfidence = (message, category, specificIntent) => {
  let confidence = 0.5 // Base confidence

  // High confidence for exact FAQ phrases
  if (category === 'FAQ' && FAQ_EXACT_PHRASES.some((phrase) => message.includes(phrase))) {
    confidence += 0.4
  }

  // Increase confidence for strong keyword matches
  const allKeywords =
    category === 'FAQ' ? Object.values(SPECIFIC_KEYWORDS.FAQ).flat() : Object.values(SPECIFIC_KEYWORDS.ACTIONS).flat()

  const matchCount = allKeywords.filter((keyword) => message.includes(keyword)).length

  // More matches = higher confidence
  confidence += Math.min(matchCount * 0.15, 0.3)

  // Boost for question patterns in FAQ
  if (category === 'FAQ' && isQuestionPattern(message)) {
    confidence += 0.2
  }

  // Boost for personal pronouns in ACTION
  if (category === 'ACTION' && /tôi|mình|của tôi/.test(message)) {
    confidence += 0.2
  }

  // Boost for specific intent matches
  if (specificIntent !== 'general_question' && specificIntent !== 'general_action') {
    confidence += 0.1
  }

  return Math.min(confidence, 0.95)
}

// Utility function to escape regex special characters
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Test function for debugging
export const testClassification = (message) => {
  const result = classifyIntent(message)
  console.log(`Message: "${message}"`)
  console.log(`Category: ${result.category}`)
  console.log(`Specific Intent: ${result.specificIntent}`)
  console.log(`Confidence: ${result.confidence}`)
  console.log('---')
  return result
}

// Export for testing
export { FAQ_EXACT_PHRASES, SPECIFIC_KEYWORDS, ACTION_KEYWORDS, FAQ_KEYWORDS }
