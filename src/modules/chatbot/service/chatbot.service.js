// chatbot.service.js - Updated to use new simplified FAQ system

import { chatbotConversationModel } from '../model/chatbotConversation.model.js'
import { chatbotActionModel } from '../model/chatbotAction.model.js'
import { gymInfoModel } from '../model/gymInfo.model.js'
import { userModel } from '~/modules/user/model/user.model.js'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model.js'
import { sanitize } from '~/utils/utils.js'
import CHATBOT_CONFIG, {
  initializeGeminiClient,
  updateTemplate,
  getChatbotConfig,
  validateMessage,
} from '~/config/chatbot.config.js'

// ✅ FIXED: Use correct named imports
import { classifyIntent } from './intent.classifier.js'
import { handleFAQ } from './faq.service.js'
import { handleAction } from './action/action.coordinator.js'

// Initialize Gemini client once at module level
let geminiClient = null
let geminiModel = null

const initializeAI = () => {
  if (!geminiClient) {
    try {
      const { genAI, model } = initializeGeminiClient()
      geminiClient = genAI
      geminiModel = model
      console.log('✅ Gemini AI initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error)
      throw error
    }
  }
  return { geminiClient, geminiModel }
}

// Helper functions
const generateAnonymousId = () => `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const validateMessageLength = (message) => {
  const maxLength = getChatbotConfig('CONVERSATION.MAX_MESSAGE_LENGTH')
  const minLength = getChatbotConfig('CONVERSATION.MIN_MESSAGE_LENGTH')

  if (message.length > maxLength) {
    return {
      isValid: false,
      error: `Tin nhắn quá dài! Vui lòng giới hạn trong ${maxLength} ký tự.`,
    }
  }

  if (message.length < minLength) {
    return {
      isValid: false,
      error: `Tin nhắn quá ngắn! Vui lòng nhập ít nhất ${minLength} ký tự.`,
    }
  }

  return { isValid: true }
}

const getOrCreateConversation = async (userId, anonymousId, isAuthenticated) => {
  try {
    let conversation

    if (isAuthenticated) {
      conversation = await chatbotConversationModel.getActiveConversationByUser(userId, 'authenticated')
    } else {
      const finalAnonymousId = anonymousId || generateAnonymousId()
      conversation = await chatbotConversationModel.getActiveConversationByUser(finalAnonymousId, 'anonymous')
    }

    if (!conversation) {
      const conversationData = {
        userId: isAuthenticated ? userId : null,
        anonymousId: isAuthenticated ? null : anonymousId || generateAnonymousId(),
        userType: isAuthenticated ? 'authenticated' : 'anonymous',
        sessionId: generateSessionId(),
        messages: [],
        status: 'active',
      }

      const result = await chatbotConversationModel.createNew(conversationData)
      conversation = await chatbotConversationModel.getDetailById(result.insertedId)
    }

    return conversation
  } catch (error) {
    throw new Error(`Failed to get/create conversation: ${error.message}`)
  }
}

// ✅ SIMPLIFIED: Main intent handling using new simple FAQ system
const handleIntent = async (intentResult, message, userId, conversationId, isAuthenticated) => {
  const { category, specificIntent, faqCategory, confidence } = intentResult

  console.log('🛠 Intent handling:', { category, specificIntent, faqCategory, confidence })

  // Route based on category (FAQ vs ACTION)
  if (category === 'FAQ') {
    return await handleFAQIntent(intentResult, message, userId)
  } else if (category === 'ACTION') {
    return await handleActionIntent(specificIntent, message, userId, isAuthenticated)
  } else {
    return getUnknownIntentResponse()
  }
}

// ✅ SIMPLIFIED: Handle FAQ intents using new simple system
const handleFAQIntent = async (intentResult, message, userId = null) => {
  try {
    console.log('🛠 FAQ Intent handling:', intentResult)

    // Use new simple FAQ system
    const faqResult = await handleFAQ(message, userId)

    console.log('🛠 FAQ Result:', faqResult)

    if (faqResult && faqResult.content) {
      return {
        content: faqResult.content,
        type: faqResult.type || 'faq_response',
        source: 'faq_service',
        data: faqResult.data || null,
      }
    } else {
      console.warn('FAQ result invalid:', faqResult)
      return getErrorResponse()
    }
  } catch (error) {
    console.error('FAQ Intent handling error:', error)
    return getErrorResponse()
  }
}

// Handle ACTION intents - call action service or show login required
const handleActionIntent = async (specificIntent, message, userId, isAuthenticated) => {
  // SPECIAL CASE: register_account doesn't need authentication
  if (specificIntent === 'register_account') {
    const entities = extractEntitiesFromMessage(message)

    try {
      const actionResult = await handleAction(specificIntent, entities, null)
      return actionResult
    } catch (error) {
      console.error('Register account error:', error)
      return getActionComingSoonResponse(specificIntent)
    }
  }

  // All other ACTIONs need authentication
  if (!isAuthenticated) {
    return getLoginRequiredResponse(specificIntent)
  }

  const entities = extractEntitiesFromMessage(message)

  try {
    const actionResult = await handleAction(specificIntent, entities, userId)
    return actionResult
  } catch (error) {
    console.error('Action intent handling error:', error)
    return getActionComingSoonResponse(specificIntent)
  }
}

// Simple entity extraction from message
const extractEntitiesFromMessage = (message) => {
  const entities = {
    originalText: message,
  }

  // Extract confirmation
  if (/xác nhận|đồng ý|ok|yes|có/i.test(message)) {
    entities.confirmed = true
  }

  // Extract membership types
  const messageLower = message.toLowerCase()
  if (messageLower.includes('basic') || messageLower.includes('cơ bản')) {
    entities.membershipType = 'basic'
  } else if (messageLower.includes('premium') || messageLower.includes('cao cấp')) {
    entities.membershipType = 'premium'
  } else if (messageLower.includes('vip')) {
    entities.membershipType = 'vip'
  }

  return entities
}

// Response helpers
const getLoginRequiredResponse = (actionIntent) => {
  const actionLabels = {
    register_membership: 'đăng ký gói tập',
    register_class: 'đăng ký lớp học',
    check_membership: 'kiểm tra gói tập',
    check_schedule: 'xem lịch cá nhân',
    book_trainer: 'đặt lịch trainer',
    cancel_booking: 'hủy lịch hẹn',
    contact_staff: 'liên hệ staff',
    requires_login: 'thực hiện hành động này',
  }

  const actionLabel = actionLabels[actionIntent] || 'thực hiện hành động này'

  return {
    content: `Để ${actionLabel}, bạn cần đăng nhập.\n\n🔐 ĐĂNG NHẬP ĐỂ:\n• Đặt lịch tập\n• Kiểm tra membership\n• Xem lịch cá nhân\n• Đăng ký lớp học\n\n💡 Sau khi đăng nhập, tôi sẽ giúp bạn ${actionLabel}!`,
    type: 'login_required',
    actionIntent,
    requiresAuth: true,
  }
}

const getActionComingSoonResponse = (actionIntent) => {
  return {
    content: `Tính năng "${actionIntent}" đang được phát triển.\n\n💪 Hiện tại bạn có thể:\n• Hỏi thông tin về gym\n• Xem các gói membership\n• Tìm hiểu về lớp học và trainer\n• Kiểm tra cơ sở gym\n\n📞 Vui lòng liên hệ staff để được hỗ trợ trực tiếp: 1900-1234`,
    type: 'coming_soon',
    actionIntent,
  }
}

const getUnknownIntentResponse = () => {
  return {
    content:
      '🤔 Tôi chưa hiểu câu hỏi của bạn.\n\n💪 Bạn có thể hỏi về:\n• Giờ mở cửa gym\n• Cơ sở gym\n• Gói membership\n• Lớp học\n• Trainer\n• Thiết bị\n\nHoặc nói "xin chào" để bắt đầu!',
    type: 'unknown_intent',
  }
}

const getErrorResponse = () => {
  return {
    content:
      'Xin lỗi, đã xảy ra lỗi kỹ thuật.\n\n💪 Bạn có thể:\n• Thử lại với câu hỏi khác\n• Liên hệ hotline: 1900-1234\n• Hỏi về thông tin cơ bản gym\n\nTôi luôn sẵn sàng hỗ trợ bạn!',
    type: 'error',
  }
}

// Save message to conversation
const saveMessage = async (conversationId, userMessage, botResponse, intentResult) => {
  try {
    const messageData = {
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
    }

    const botMessageData = {
      type: 'bot',
      content: botResponse.content,
      timestamp: new Date(),
      intent: intentResult.specificIntent,
      confidence: intentResult.confidence,
      responseType: botResponse.type,
    }

    // Save both messages
    await chatbotConversationModel.addMessageToConversation(conversationId, messageData)
    await chatbotConversationModel.addMessageToConversation(conversationId, botMessageData)
  } catch (error) {
    console.error('Failed to save message:', error)
  }
}

// ✅ MAIN: Processing function with simplified flow
const processMessage = async (userId, message, anonymousId) => {
  try {
    console.log('🛠 Processing message:', { userId, message, anonymousId })

    // Validate message
    const validation = validateMessage(message)
    if (!validation.valid) {
      console.log('🛠 Message validation failed:', validation)
      return {
        success: false,
        response: {
          content: validation.error,
          type: 'validation_error',
        },
      }
    }

    // Determine user type
    const isAuthenticated = !!userId
    console.log('🛠 User authenticated:', isAuthenticated)

    // Get or create conversation
    const conversation = await getOrCreateConversation(userId, anonymousId, isAuthenticated)
    console.log('🛠 Conversation:', conversation._id)

    // Classify intent using simple classifier
    const intentResult = classifyIntent(message)
    console.log('🛠 Intent result:', intentResult)

    // Handle business logic
    const response = await handleIntent(intentResult, message, userId, conversation._id, isAuthenticated)
    console.log('🛠 Intent response:', response)

    // Save message to conversation
    await saveMessage(conversation._id, message, response, intentResult)

    return {
      success: true,
      response,
      conversationId: conversation._id,
      anonymousId: isAuthenticated ? null : conversation.anonymousId,
      metadata: {
        category: intentResult.category,
        specificIntent: intentResult.specificIntent,
        faqCategory: intentResult.faqCategory,
        confidence: intentResult.confidence,
        needsAuth: intentResult.category === 'ACTION' && !userId && intentResult.specificIntent !== 'register_account',
      },
    }
  } catch (error) {
    console.error('🚨 Chatbot processing error:', error)
    return {
      success: false,
      response: {
        content:
          'Xin lỗi, đã xảy ra lỗi kỹ thuật. Vui lòng thử lại sau!\n\n📞 Liên hệ: 1900-1234 nếu vấn đề tiếp tục xảy ra.',
        type: 'system_error',
      },
      error: error.message,
    }
  }
}

// Conversation history functions
const getConversationHistory = async (userId, includeMessages = true) => {
  try {
    if (!userId) {
      throw new Error('User ID is required')
    }

    const conversation = await chatbotConversationModel.getActiveConversationByUser(userId, 'authenticated')

    if (!conversation) {
      return {
        success: false,
        message: 'No conversation found',
      }
    }

    return {
      success: true,
      conversation,
      messageCount: conversation.messages?.length || 0,
    }
  } catch (error) {
    console.error('Get conversation history error:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}

const getAnonymousConversationHistory = async (anonymousId, includeMessages = true) => {
  try {
    if (!anonymousId) {
      throw new Error('Anonymous ID is required')
    }

    console.log('🛠 Getting anonymous conversation for:', anonymousId)

    const conversation = await chatbotConversationModel.getActiveConversationByUser(anonymousId, 'anonymous')

    if (!conversation) {
      console.log('🛠 No anonymous conversation found for:', anonymousId)
      return {
        success: false,
        message: 'No anonymous conversation found',
      }
    }

    console.log('🛠 Found anonymous conversation:', conversation._id)

    return {
      success: true,
      conversation,
      messageCount: conversation.messages?.length || 0,
    }
  } catch (error) {
    console.error('Get anonymous conversation error:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}

export const chatbotService = {
  processMessage,
  getConversationHistory,
  getAnonymousConversationHistory,
  initializeAI,
}
