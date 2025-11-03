import { StatusCodes } from 'http-status-codes'
import { chatbotService } from '../service/chatbot.service.js'

const sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body
    const userId = req.user?.userId
    console.log('🚀 ~ sendMessage ~ userId:', userId)

    if (!message || message.trim() === '') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Message is required and cannot be empty',
      })
    }

    const result = await chatbotService.processMessage(userId, message.trim())

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Message processed successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Failed to process message',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

const sendAnonymousMessage = async (req, res, next) => {
  try {
    const { message, anonymousId } = req.body

    if (!message || message.trim() === '') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Message is required and cannot be empty',
      })
    }

    const result = await chatbotService.processMessage(null, message.trim(), anonymousId)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Anonymous message processed successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Failed to process anonymous message',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

const getConversationHistory = async (req, res, next) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User authentication required',
      })
    }

    const result = await chatbotService.getConversationHistory(userId, true)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Conversation history retrieved successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'No conversation history found',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

const getAnonymousConversationHistory = async (req, res, next) => {
  try {
    const { anonymousId } = req.params

    if (!anonymousId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Anonymous ID is required',
      })
    }

    const result = await chatbotService.getConversationHistory(anonymousId, false)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Anonymous conversation history retrieved successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'No anonymous conversation history found',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

const getChatbotHealth = async (req, res, next) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      features: {
        authenticated_chat: true,
        anonymous_chat: true,
        intent_recognition: true,
        booking_integration: true,
        membership_management: true,
        class_registration: true,
        trainer_booking: true,
        cancellation_service: true,
        user_registration: true,
        knowledge_base: true,
        gym_info: true,
      },
      services: {
        action_coordinator: true,
        membership_service: true,
        booking_service: true,
        registration_service: true,
        cancellation_service: true,
      },
      models: {
        conversations: 'chatbotconversations',
        knowledge: 'chatbotknowledgebase',
        actions: 'chatbotactions',
        gymInfo: 'gyminfo',
      },
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Chatbot service is healthy',
      data: healthData,
    })
  } catch (error) {
    next(error)
  }
}

const getQuickReplies = async (req, res, next) => {
  try {
    const userId = req.user?.userId
    const isAuthenticated = !!userId

    let quickReplies = []

    if (isAuthenticated) {
      quickReplies = [
        { text: 'Lịch tập của tôi', action: 'check_schedule' },
        { text: 'Đăng ký lớp học', action: 'register_class' },
        { text: 'Thông tin membership', action: 'check_membership' },
        { text: 'Đặt lịch trainer', action: 'book_trainer' },
        { text: 'Hủy lịch tập', action: 'cancel_booking' },
        { text: 'Đăng ký gói mới', action: 'register_membership' },
      ]
    } else {
      quickReplies = [
        { text: 'Đăng ký tài khoản', action: 'register_account' },
        { text: 'Giờ mở cửa gym', action: 'faq', params: { question: 'operating_hours' } },
        { text: 'Thông tin liên hệ', action: 'contact_staff' },
        { text: 'Các gói membership', action: 'faq', params: { question: 'membership' } },
        { text: 'Lớp học có gì?', action: 'faq', params: { question: 'classes' } },
        { text: 'Chào hỏi', action: 'greeting' },
      ]
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Quick replies retrieved successfully',
      quickReplies,
      isAuthenticated,
    })
  } catch (error) {
    next(error)
  }
}

const processQuickReply = async (req, res, next) => {
  try {
    const { action, params = {} } = req.body
    const userId = req.user?.userId

    if (!action) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Action is required',
      })
    }

    // Convert quick reply action to natural language message
    let message = ''

    switch (action) {
      case 'check_schedule':
        message = 'Xem lịch tập của tôi'
        break
      case 'register_class':
        message = `Đăng ký lớp ${params.classType || 'học'}`
        break
      case 'check_membership':
        message = 'Kiểm tra thông tin membership'
        break
      case 'book_trainer':
        message = 'Đặt lịch với trainer'
        break
      case 'cancel_booking':
        message = 'Hủy lịch tập'
        break
      case 'register_membership':
        message = 'Đăng ký gói membership'
        break
      case 'register_account':
        message = 'Đăng ký tài khoản'
        break
      case 'contact_staff':
        message = 'Liên hệ nhân viên'
        break
      case 'greeting':
        message = 'Chào bạn'
        break
      case 'faq':
        const faqQuestions = {
          operating_hours: 'Giờ mở cửa gym',
          contact: 'Thông tin liên hệ',
          membership: 'Các gói membership',
          classes: 'Lớp học có gì',
          policies: 'Quy định gym',
        }
        message = faqQuestions[params.question] || 'Câu hỏi thường gặp'
        break
      default:
        message = action
    }

    const result = await chatbotService.processMessage(userId, message)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Quick reply processed successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Failed to process quick reply',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

// Admin/Management Controllers
const getAllConversations = async (req, res, next) => {
  try {
    const result = await chatbotService.getAllConversations()

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'All conversations retrieved successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve conversations',
      })
    }
  } catch (error) {
    next(error)
  }
}

const getConversationsByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'User ID is required',
      })
    }

    const result = await chatbotService.getConversationsByUserId(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'User conversations retrieved successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'No conversations found for this user',
      })
    }
  } catch (error) {
    next(error)
  }
}

const getAllActions = async (req, res, next) => {
  try {
    const result = await chatbotService.getAllActions()

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'All actions retrieved successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve actions',
      })
    }
  } catch (error) {
    next(error)
  }
}

const getActionsByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'User ID is required',
      })
    }

    const result = await chatbotService.getActionsByUserId(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'User actions retrieved successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'No actions found for this user',
      })
    }
  } catch (error) {
    next(error)
  }
}

const getAllKnowledge = async (req, res, next) => {
  try {
    const result = await chatbotService.getAllKnowledge()

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'All knowledge retrieved successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve knowledge base',
      })
    }
  } catch (error) {
    next(error)
  }
}

const createKnowledgeBase = async (req, res, next) => {
  try {
    const result = await chatbotService.createKnowledge(req.body)

    if (result.success) {
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Knowledge base entry created successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Failed to create knowledge base entry',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

const updateKnowledgeBase = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await chatbotService.updateKnowledge(id, req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Knowledge base entry updated successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Failed to update knowledge base entry',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

const deleteKnowledge = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await chatbotService.deleteKnowledge(id)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Knowledge base entry deleted successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Failed to delete knowledge base entry',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

const getAllGymInfo = async (req, res, next) => {
  try {
    const result = await chatbotService.getAllGymInfo()

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'All gym info retrieved successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve gym info',
      })
    }
  } catch (error) {
    next(error)
  }
}

const createGymInfo = async (req, res, next) => {
  try {
    const result = await chatbotService.createGymInfo(req.body)

    if (result.success) {
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Gym info created successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Failed to create gym info',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

const updateGymInfo = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await chatbotService.updateGymInfo(id, req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Gym info updated successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Failed to update gym info',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

const deleteGymInfo = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await chatbotService.deleteGymInfo(id)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Gym info deleted successfully',
        ...result,
      })
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Failed to delete gym info',
        ...result,
      })
    }
  } catch (error) {
    next(error)
  }
}

const getChatbotAnalytics = async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query

    let dateRange = null

    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
    }

    const result = await chatbotService.getChatbotAnalytics(dateRange)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Chatbot analytics retrieved successfully',
        period: period || 'custom',
        ...result,
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve analytics',
      })
    }
  } catch (error) {
    next(error)
  }
}

// Development/Testing endpoints
const testIntentRecognition = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'This endpoint is only available in development mode',
      })
    }

    const { message } = req.body

    if (!message) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Message is required for testing',
      })
    }

    // Process message with debug info
    const result = await chatbotService.processMessage(null, message, 'test_user')

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Intent recognition test completed',
      testResult: {
        input: message,
        analysis: result.analysis,
        response: result.response,
      },
    })
  } catch (error) {
    next(error)
  }
}

const seedTestData = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'This endpoint is only available in development mode',
      })
    }

    // Import and run seed function
    const { seedChatbotData } = await import('../config/seedChatbotData.js')
    const result = await seedChatbotData()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Test data seeded successfully',
      ...result,
    })
  } catch (error) {
    next(error)
  }
}

const linkAnonymousConversation = async (req, res, next) => {
  try {
    const { anonymousId } = req.body
    const userId = req.user?.id

    // Validate input
    if (!anonymousId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Anonymous ID is required',
      })
    }

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User authentication required',
      })
    }

    // Call service to link conversation
    const result = await chatbotService.linkAnonymousConversation(anonymousId, userId)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: result.message,
        data: {
          conversationId: result.conversationId,
          messagesTransferred: result.messagesTransferred,
        },
      })
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: result.message,
        error: result.error,
      })
    }
  } catch (error) {
    console.error('Link anonymous conversation controller error:', error)
    next(error)
  }
}

export const chatbotController = {
  // Core chat functionality
  sendMessage,
  sendAnonymousMessage,
  getConversationHistory,
  getAnonymousConversationHistory,
  getChatbotHealth,
  getQuickReplies,
  processQuickReply,
  linkAnonymousConversation,

  // Admin/Management
  getAllConversations,
  getConversationsByUserId,
  getAllActions,
  getActionsByUserId,
  getAllKnowledge,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledge,
  getAllGymInfo,
  createGymInfo,
  updateGymInfo,
  deleteGymInfo,
  getChatbotAnalytics,

  // Development/Testing
  testIntentRecognition,
  seedTestData,
}
