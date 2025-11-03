import { chatbotConversationModel } from '../model/chatbotConversation.model'
import { chatbotKnowledgeModel } from '../model/chatbotKnowledge.model'
import { chatbotActionModel } from '../model/chatbotAction.model'
import { gymInfoModel } from '../model/gymInfo.model'
import { userModel } from '~/modules/user/model/user.model'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model'
import { sanitize } from '~/utils/utils'
import CHATBOT_CONFIG, {
  initializeGeminiClient,
  updateTemplate,
  getChatbotConfig,
  validateMessage,
} from '~/config/chatbot.config'
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

// Main intent handling với intent classifier
const handleIntent = async (intentResult, message, userId, conversationId, isAuthenticated) => {
  const { category, specificIntent, confidence } = intentResult

  // Route dựa trên category (FAQ vs ACTION)
  if (category === 'FAQ') {
    return await handleFAQIntent(specificIntent, message)
  } else if (category === 'ACTION') {
    return await handleActionIntent(specificIntent, message, userId, isAuthenticated)
  } else {
    return getUnknownIntentResponse()
  }
}

// Handle FAQ intents
const handleFAQIntent = async (specificIntent, message) => {
  try {
    // Nếu là greeting đặc biệt, xử lý riêng
    if (specificIntent === 'greeting') {
      return {
        content: updateTemplate('GREETING_ANONYMOUS'),
        type: 'greeting_anonymous',
        source: 'template',
      }
    }

    // Gọi FAQ service với specific intent
    const faqResult = await handleFAQ(message, specificIntent)

    if (faqResult.success) {
      return faqResult
    } else {
      return getErrorResponse()
    }
  } catch (error) {
    console.error('FAQ Intent handling error:', error)
    return getErrorResponse()
  }
}

// Handle ACTION intents - call action service
const handleActionIntent = async (specificIntent, message, userId, isAuthenticated) => {
  // SPECIAL CASE: register_account không cần authentication
  if (specificIntent === 'register_account') {
    // Extract entities from message
    const entities = extractEntitiesFromMessage(message)

    try {
      const actionResult = await handleAction(specificIntent, entities, null) // Pass null userId cho register
      return actionResult
    } catch (error) {
      console.error('Register account error:', error)
      return getActionComingSoonResponse(specificIntent)
    }
  }

  // Tất cả ACTION khác đều cần authentication
  if (!isAuthenticated) {
    return getLoginRequiredResponse(specificIntent)
  }

  // Extract entities from message (simple keyword extraction for now)
  const entities = extractEntitiesFromMessage(message)

  // Call action service
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
  }

  const actionLabel = actionLabels[actionIntent] || 'thực hiện hành động này'

  return {
    content: updateTemplate('LOGIN_REQUIRED', { action: actionLabel }),
    type: 'login_required',
    actionIntent,
    requiresAuth: true,
  }
}

const getActionComingSoonResponse = (actionIntent) => {
  return {
    content: `Tính năng này đang được phát triển. Hiện tại bạn có thể:\n\n• Hỏi thông tin về gym\n• Xem các gói membership\n• Tìm hiểu về lớp học và trainer\n\nVui lòng liên hệ staff để được hỗ trợ trực tiếp!`,
    type: 'coming_soon',
    actionIntent,
  }
}

const getUnknownIntentResponse = () => {
  return {
    content: updateTemplate('UNKNOWN_INTENT'),
    type: 'unknown_intent',
  }
}

const getErrorResponse = () => {
  return {
    content: updateTemplate('ERROR_RESPONSE'),
    type: 'error',
  }
}

// Save message to conversation
const saveMessage = async (conversationId, userMessage, botResponse, intentResult) => {
  try {
    const messageData = {
      userMessage: sanitize(userMessage),
      botResponse: {
        content: botResponse.content,
        type: botResponse.type,
        source: botResponse.source || 'unknown',
      },
      intent: intentResult.specificIntent,
      category: intentResult.category,
      confidence: intentResult.confidence,
      timestamp: new Date(),
    }

    await chatbotConversationModel.addMessageToConversation(conversationId, messageData)
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
          type: 'error',
        },
      }
    }

    // Xác định loại user
    const isAuthenticated = !!userId
    console.log('🚀 ~ processMessage ~ isAuthenticated:', isAuthenticated)

    // Lấy hoặc tạo conversation
    const conversation = await getOrCreateConversation(userId, anonymousId, isAuthenticated)

    // Phân tích intent với classifier
    const intentResult = classifyIntent(message)

    // Xử lý business logic
    const response = await handleIntent(intentResult, message, userId, conversation._id, isAuthenticated)

    // Lưu message vào conversation
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
        needsAuth: intentResult.category === 'ACTION' && !userId && intentResult.specificIntent !== 'register_account',
      },
    }
  } catch (error) {
    console.error('Chatbot error:', error)
    return {
      success: false,
      response: getErrorResponse(),
      error: error.message,
    }
  }
}

// Conversation management functions
const getConversationHistory = async (userId, isAuthenticated = true) => {
  console.log('🚀 ~ getConversationHistory ~ userId:', userId)
  try {
    const userType = isAuthenticated ? 'authenticated' : 'anonymous'
    const conversation = await chatbotConversationModel.getActiveConversationByUser(userId, userType)

    if (!conversation) {
      return {
        success: false,
        message: 'No conversation found',
      }
    }

    return {
      success: true,
      conversation: sanitize(conversation),
      messages: conversation.messages || [],
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getAllConversations = async () => {
  try {
    const conversations = await chatbotConversationModel.getAllConversations()
    return {
      success: true,
      conversations: conversations.map((conv) => sanitize(conv)),
      total: conversations.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getConversationsByUserId = async (userId) => {
  try {
    const conversations = await chatbotConversationModel.getConversationsByUserId(userId)
    return {
      success: true,
      conversations: conversations.map((conv) => sanitize(conv)),
      total: conversations.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Admin functions cho knowledge base
const getAllKnowledge = async () => {
  try {
    const knowledge = await chatbotKnowledgeModel.getAllKnowledge()
    return {
      success: true,
      knowledge: knowledge.map((item) => sanitize(item)),
      total: knowledge.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const createKnowledge = async (data) => {
  try {
    const result = await chatbotKnowledgeModel.createNew(data)
    const knowledge = await chatbotKnowledgeModel.getDetailById(result.insertedId)

    return {
      success: true,
      message: 'Knowledge created successfully',
      knowledge: sanitize(knowledge),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateKnowledge = async (knowledgeId, data) => {
  try {
    const result = await chatbotKnowledgeModel.updateInfo(knowledgeId, data)

    if (!result) {
      return {
        success: false,
        message: 'Knowledge not found',
      }
    }

    return {
      success: true,
      message: 'Knowledge updated successfully',
      knowledge: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteKnowledge = async (knowledgeId) => {
  try {
    const result = await chatbotKnowledgeModel.softDeleteKnowledge(knowledgeId)

    if (!result) {
      return {
        success: false,
        message: 'Knowledge not found',
      }
    }

    return {
      success: true,
      message: 'Knowledge deleted successfully',
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Gym Info management
const getAllGymInfo = async () => {
  try {
    const gymInfo = await gymInfoModel.getAllInfo()
    return {
      success: true,
      gymInfo: gymInfo.map((info) => sanitize(info)),
      total: gymInfo.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const createGymInfo = async (data) => {
  try {
    const result = await gymInfoModel.createNew(data)
    const gymInfo = await gymInfoModel.getDetailById(result.insertedId)

    return {
      success: true,
      message: 'Gym info created successfully',
      gymInfo: sanitize(gymInfo),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateGymInfo = async (infoId, data) => {
  try {
    const result = await gymInfoModel.updateInfo(infoId, data)

    if (!result) {
      return {
        success: false,
        message: 'Gym info not found',
      }
    }

    return {
      success: true,
      message: 'Gym info updated successfully',
      gymInfo: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteGymInfo = async (infoId) => {
  try {
    const result = await gymInfoModel.softDeleteInfo(infoId)

    if (!result) {
      return {
        success: false,
        message: 'Gym info not found',
      }
    }

    return {
      success: true,
      message: 'Gym info deleted successfully',
    }
  } catch (error) {
    throw new Error(error)
  }
}

const linkAnonymousConversation = async (anonymousId, userId) => {
  try {
    // Validate inputs
    if (!anonymousId || !userId) {
      return {
        success: false,
        message: 'Anonymous ID and User ID are required',
      }
    }

    // Find the anonymous conversation
    const anonymousConversation = await chatbotConversationModel.getActiveConversationByUser(anonymousId, 'anonymous')

    if (!anonymousConversation) {
      return {
        success: false,
        message: 'Anonymous conversation not found',
      }
    }

    // Check if user already has an authenticated conversation
    const existingAuthConversation = await chatbotConversationModel.getActiveConversationByUser(userId, 'authenticated')

    if (existingAuthConversation) {
      // Merge conversations: copy messages from anonymous to authenticated
      const anonymousMessages = anonymousConversation.messages || []

      if (anonymousMessages.length > 0) {
        // Add all anonymous messages to authenticated conversation
        for (const message of anonymousMessages) {
          await chatbotConversationModel.addMessageToConversation(existingAuthConversation._id, message)
        }
      }

      // End the anonymous conversation
      await chatbotConversationModel.endConversation(anonymousConversation._id)

      return {
        success: true,
        message: 'Anonymous conversation merged with existing authenticated conversation',
        conversationId: existingAuthConversation._id,
        messagesTransferred: anonymousMessages.length,
      }
    } else {
      // Convert anonymous conversation to authenticated
      const updateResult = await chatbotConversationModel.updateInfo(anonymousConversation._id, {
        userId: userId,
        userType: 'authenticated',
        // Keep anonymousId for tracking purposes
      })

      if (!updateResult) {
        return {
          success: false,
          message: 'Failed to link anonymous conversation',
        }
      }

      return {
        success: true,
        message: 'Anonymous conversation successfully linked to user account',
        conversationId: anonymousConversation._id,
        messagesTransferred: (anonymousConversation.messages || []).length,
      }
    }
  } catch (error) {
    console.error('Link anonymous conversation error:', error)
    return {
      success: false,
      message: 'Failed to link anonymous conversation',
      error: error.message,
    }
  }
}

export const chatbotService = {
  processMessage,
  getConversationHistory,
  getAllConversations,
  getConversationsByUserId,
  getAllKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getAllGymInfo,
  createGymInfo,
  updateGymInfo,
  deleteGymInfo,
  linkAnonymousConversation,
}
