// chatbot.service.js - AI-Powered Chatbot with OpenAI Function Calling

import { chatbotConversationModel } from '../model/chatbotConversation.model.js'
import { userModel } from '~/modules/user/model/user.model.js'
import { validateMessage } from '~/config/chatbot.config.js'
import { handleFunctionCallingFlow } from './openai.service.js'

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

// Save message to conversation
const saveMessage = async (conversationId, userMessage, botResponse) => {
  try {
    // Save user message
    await chatbotConversationModel.addMessageToConversation(conversationId, {
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
    })

    // Save bot message
    await chatbotConversationModel.addMessageToConversation(conversationId, {
      type: 'bot',
      content: botResponse,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('Failed to save message:', error)
  }
}

// Main processing function with Gemini AI
const processMessage = async (userId, message, anonymousId) => {
  try {
    console.log('💬 Processing message:', { userId: userId || 'anonymous', message: message.substring(0, 50) })

    // Validate message
    const validation = validateMessage(message)
    if (!validation.valid) {
      return {
        success: false,
        response: {
          content: validation.error || 'Tin nhắn không hợp lệ',
          type: 'validation_error',
        },
      }
    }

    // Determine user type
    const isAuthenticated = !!userId

    // Get user info if authenticated
    let userName = null
    if (userId) {
      try {
        const user = await userModel.getDetailById(userId)
        userName = user?.fullName || 'Quý khách'
      } catch (error) {
        console.error('Error getting user info:', error)
        userName = 'Quý khách'
      }
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(userId, anonymousId, isAuthenticated)

    // Call OpenAI with function calling
    console.log('🤖 Calling OpenAI...')
    const aiResponse = await handleFunctionCallingFlow(message, conversation, userId, userName)

    // Save messages to conversation
    await saveMessage(conversation._id, message, aiResponse)

    console.log('✅ Message processed successfully')

    return {
      success: true,
      response: {
        content: aiResponse,
        type: 'ai_response',
      },
      conversationId: conversation._id,
      anonymousId: isAuthenticated ? null : conversation.anonymousId,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('🚨 Chatbot processing error:', error)

    // Friendly error response
    let errorMessage =
      'Xin lỗi, hệ thống AI đang gặp sự cố. Vui lòng thử lại sau!\n\n📞 Hotline hỗ trợ: 1900-1234'

    if (error.message?.includes('API key')) {
      errorMessage = 'Hệ thống AI chưa được cấu hình. Vui lòng liên hệ admin.\n\n📞 Hotline: 1900-1234'
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      errorMessage = 'Hệ thống đang quá tải. Vui lòng thử lại sau ít phút.\n\n📞 Hotline: 1900-1234'
    }

    return {
      success: false,
      response: {
        content: errorMessage,
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
}
