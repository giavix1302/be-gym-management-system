import { chatbotService } from '../service/chatbot.service.js'
import { chatbotConversationModel } from '../model/chatbotConversation.model.js'
import { StatusCodes } from 'http-status-codes'

// ========================================
// CORE CHATBOT FUNCTIONS
// ========================================

// Health check endpoint
const getChatbotHealth = async (req, res) => {
  try {
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'AI Chatbot service is healthy',
      timestamp: new Date().toISOString(),
      aiStatus: 'connected',
      version: '2.0 - OpenAI Function Calling',
    })
  } catch (error) {
    console.error('Chatbot health check error:', error)
    res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Chatbot service is unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
}

// Anonymous message handling
const sendAnonymousMessage = async (req, res) => {
  try {
    const { message, anonymousId } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Message is required and must be a non-empty string',
      })
    }

    const result = await chatbotService.processMessage(null, message.trim(), anonymousId)

    res.status(StatusCodes.OK).json({
      success: result.success,
      response: result.response,
      conversationId: result.conversationId,
      anonymousId: result.anonymousId,
      metadata: result.metadata || {},
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Anonymous message processing error:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process anonymous message',
      error: error.message,
    })
  }
}

// Authenticated message handling - ✅ UPDATED: Get userId from params
const sendMessage = async (req, res) => {
  try {
    const { message } = req.body
    const { userId } = req.params // ✅ FIXED: Get userId from params instead of req.user
    console.log('🚀 ~ sendMessage ~ userId:', userId)

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Message is required and must be a non-empty string',
      })
    }

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'User ID is required in params',
      })
    }

    const result = await chatbotService.processMessage(userId, message.trim(), null)

    res.status(StatusCodes.OK).json({
      success: result.success,
      response: result.response,
      conversationId: result.conversationId,
      metadata: result.metadata || {},
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Authenticated message processing error:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process message',
      error: error.message,
    })
  }
}

const getConversationHistory = async (req, res) => {
  try {
    // Get userId from params instead of token
    const { userId, conversationId } = req.params

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'User ID is required in params',
      })
    }

    let result

    if (conversationId) {
      // Get specific conversation
      const conversation = await chatbotConversationModel.getDetailById(conversationId)

      if (!conversation) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Conversation not found',
        })
      }

      // Check if user owns this conversation
      if (conversation.userId !== userId) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: 'Access denied',
        })
      }

      result = {
        success: true,
        conversation,
        messageCount: conversation.messages?.length || 0,
      }
    } else {
      // Get user's active conversation
      result = await chatbotService.getConversationHistory(userId)
    }

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('Get conversation history error:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get conversation history',
      error: error.message,
    })
  }
}

// Get anonymous conversation history
const getAnonymousConversationHistory = async (req, res) => {
  try {
    const { anonymousId } = req.params

    if (!anonymousId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Anonymous ID is required',
      })
    }

    const result = await chatbotService.getAnonymousConversationHistory(anonymousId)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('Get anonymous conversation history error:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get anonymous conversation history',
      error: error.message,
    })
  }
}

// ========================================
// DEPRECATED: Quick Replies (No longer needed with AI)
// ========================================
// AI now handles all queries naturally without predefined quick replies
// These endpoints are kept for backward compatibility but can be removed

/**
 * @deprecated AI handles all queries naturally now
 */
const getQuickReplies = async (req, res) => {
  try {
    const { userId } = req.params
    const isAuthenticated = !!userId

    // Return minimal quick replies for backward compatibility
    const quickReplies = [
      { text: 'Xin chào', value: 'Xin chào', category: 'greeting' },
      { text: 'Giờ mở cửa gym', value: 'Gym mở cửa mấy giờ?', category: 'basic_info' },
      { text: 'Gói membership', value: 'Có những gói membership nào?', category: 'memberships' },
      { text: 'Lớp học', value: 'Có những lớp học nào?', category: 'classes' },
    ]

    if (isAuthenticated) {
      quickReplies.push(
        { text: 'Gói tập của tôi', value: 'Gói tập của tôi', category: 'personal' },
        { text: 'Lịch tập của tôi', value: 'Lịch của tôi', category: 'personal' }
      )
    }

    res.status(StatusCodes.OK).json({
      success: true,
      quickReplies,
      isAuthenticated,
      deprecated: true,
      message: 'AI now handles all queries naturally. Quick replies are optional.',
    })
  } catch (error) {
    console.error('Get quick replies error:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get quick replies',
      error: error.message,
    })
  }
}

/**
 * @deprecated Just send the message directly to sendMessage endpoint
 */
const processQuickReply = async (req, res) => {
  try {
    const { value } = req.body
    const { userId } = req.params

    if (!value || typeof value !== 'string') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Quick reply value is required',
      })
    }

    // Simply process as regular message
    const result = await chatbotService.processMessage(userId, value, null)

    res.status(StatusCodes.OK).json({
      success: result.success,
      response: result.response,
      conversationId: result.conversationId,
      timestamp: new Date().toISOString(),
      deprecated: true,
      message: 'Use sendMessage endpoint instead',
    })
  } catch (error) {
    console.error('Process quick reply error:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process quick reply',
      error: error.message,
    })
  }
}

// Link anonymous conversation to authenticated user - ✅ UPDATED: Get userId from params
const linkAnonymousConversation = async (req, res) => {
  try {
    const { anonymousId } = req.body
    const { userId } = req.params // ✅ FIXED: Get userId from params instead of req.user

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'User ID is required in params',
      })
    }

    if (!anonymousId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Anonymous ID is required',
      })
    }

    // Get anonymous conversation
    const anonymousConversation = await chatbotConversationModel.getActiveConversationByUser(anonymousId, 'anonymous')

    if (!anonymousConversation) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Anonymous conversation not found',
      })
    }

    // Check if user already has a conversation
    const userConversation = await chatbotConversationModel.getActiveConversationByUser(userId, 'authenticated')

    if (userConversation) {
      // Merge conversations if needed (optional)
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'User already has an active conversation',
        conversationId: userConversation._id,
      })
    }

    // Link anonymous conversation to user
    const updatedConversation = await chatbotConversationModel.updateInfo(anonymousConversation._id, {
      userId: userId,
      userType: 'authenticated',
      anonymousId: null,
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Anonymous conversation linked successfully',
      conversationId: updatedConversation._id,
    })
  } catch (error) {
    console.error('Link anonymous conversation error:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to link anonymous conversation',
      error: error.message,
    })
  }
}

// Get user's conversations (for profile/history) - ✅ UPDATED: Get userId from params
const getConversationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params // ✅ FIXED: Get userId from params

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'User ID is required in params',
      })
    }

    const conversations = await chatbotConversationModel.getConversationsByUserId(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      conversations,
      count: conversations.length,
    })
  } catch (error) {
    console.error('Get conversations by user ID error:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get user conversations',
      error: error.message,
    })
  }
}

export const chatbotController = {
  // Core messaging
  getChatbotHealth,
  sendAnonymousMessage,
  sendMessage,
  getConversationHistory,
  getAnonymousConversationHistory,

  // Quick replies
  getQuickReplies,
  processQuickReply,

  // Conversation management
  linkAnonymousConversation,
  getConversationsByUserId,
}
