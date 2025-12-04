// chatbot.service.js - Optimized version focusing on core functionality

import { chatbotConversationModel } from '../model/chatbotConversation.model.js'
import { userModel } from '~/modules/user/model/user.model.js'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model.js'
import { sanitize } from '~/utils/utils.js'
import CHATBOT_CONFIG, { initializeGeminiClient, validateMessage } from '~/config/chatbot.config.js'

// Import core services
import { classifyIntent } from './intent.classifier.js'
import { handleFAQ } from './faq.service.js'
import { handlePersonalInfo } from './personal.service.js'

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

// Main intent handling
const handleIntent = async (intentResult, message, userId, conversationId, isAuthenticated) => {
  const { category, specificIntent, confidence } = intentResult

  console.log('🛠 Intent handling:', { category, specificIntent, confidence })

  // Route based on category
  if (category === 'FAQ') {
    return await handleFAQIntent(message, userId)
  } else if (category === 'PERSONAL') {
    return await handlePersonalIntent(specificIntent, message, userId, isAuthenticated)
  } else {
    return getUnknownIntentResponse()
  }
}

// Handle FAQ intents
const handleFAQIntent = async (message, userId = null) => {
  try {
    const faqResult = await handleFAQ(message, userId)

    if (faqResult && faqResult.content) {
      return {
        content: faqResult.content,
        type: faqResult.type || 'faq_response',
        source: 'faq_service',
        data: faqResult.data || null,
      }
    } else {
      return getErrorResponse()
    }
  } catch (error) {
    console.error('FAQ Intent handling error:', error)
    return getErrorResponse()
  }
}

// Handle PERSONAL intents (requires authentication)
const handlePersonalIntent = async (specificIntent, message, userId, isAuthenticated) => {
  if (!isAuthenticated) {
    return getLoginRequiredResponse(specificIntent)
  }

  try {
    const personalResult = await handlePersonalInfo(specificIntent, userId)
    return personalResult
  } catch (error) {
    console.error('Personal intent handling error:', error)
    return getErrorResponse()
  }
}

// Response helpers
const getLoginRequiredResponse = (intent) => {
  const actionLabels = {
    check_membership: 'kiểm tra gói tập hiện tại',
    check_schedule: 'xem lịch tập của bạn',
    my_membership: 'xem thông tin membership',
    my_schedule: 'xem lịch cá nhân',
  }

  const actionLabel = actionLabels[intent] || 'thực hiện hành động này'

  return {
    content: `Để ${actionLabel}, bạn cần đăng nhập.\n\n🔐 ĐĂNG NHẬP ĐỂ:\n• Xem gói tập hiện tại\n• Kiểm tra lịch với PT/lớp học\n• Quản lý thông tin cá nhân\n\n💡 Sau khi đăng nhập, tôi sẽ giúp bạn ${actionLabel}!`,
    type: 'login_required',
    actionIntent: intent,
    requiresAuth: true,
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

// Main processing function
const processMessage = async (userId, message, anonymousId) => {
  try {
    // Validate message
    const validation = validateMessage(message)
    if (!validation.valid) {
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

    // Get or create conversation
    const conversation = await getOrCreateConversation(userId, anonymousId, isAuthenticated)

    // Classify intent
    const intentResult = classifyIntent(message)

    // Handle business logic
    const response = await handleIntent(intentResult, message, userId, conversation._id, isAuthenticated)

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
        confidence: intentResult.confidence,
        needsAuth: intentResult.category === 'PERSONAL' && !userId,
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

    const conversation = await chatbotConversationModel.getActiveConversationByUser(anonymousId, 'anonymous')

    if (!conversation) {
      return {
        success: false,
        message: 'No anonymous conversation found',
      }
    }

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
