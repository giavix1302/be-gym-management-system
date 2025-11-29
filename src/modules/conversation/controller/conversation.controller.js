import { StatusCodes } from 'http-status-codes'
import { conversationService } from '../service/conversation.service'

const createOrGetConversation = async (req, res, next) => {
  try {
    const { trainerId, bookingId } = req.body
    const userId = req.user.userId // ✅ SỬA: Sử dụng req.user.userId

    const result = await conversationService.createOrGetConversation({
      userId,
      trainerId,
      bookingId,
    })

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getConversations = async (req, res, next) => {
  try {
    const userId = req.params.id
    const { page, limit, role } = req.query

    const result = await conversationService.getConversationsByUserId(userId, page, limit, role)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params
    const { page, limit, role } = req.query

    // ✅ SỬA: Sử dụng req.user.userId thay vì req.user.id
    const userId = req.user?.userId // Get from auth middleware
    const userRole = role || req.user?.role || 'user'

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
      })
    }

    const result = await conversationService.getMessagesByConversationId(conversationId, userId, page, limit, userRole)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    console.error('🚀 ~ getMessages controller error:', error)
    next(error)
  }
}

const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params
    const { content } = req.body
    const { role } = req.query

    // ✅ SỬA: Sử dụng req.user.userId thay vì req.user.id
    const userId = req.user?.userId
    const userRole = role || req.user?.role || 'user'

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
      })
    }

    const result = await conversationService.sendMessage(conversationId, userId, content, userRole)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    console.error('🚀 ~ sendMessage controller error:', error)
    next(error)
  }
}

const markMessagesAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params
    const { messageIds } = req.body
    const { role } = req.query

    const userId = req.user?.userId // ✅ SỬA: Sử dụng req.user.userId
    const userRole = role || req.user?.role || 'user'

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
      })
    }

    const result = await conversationService.markMessagesAsRead(conversationId, userId, messageIds, userRole)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId // ✅ SỬA: Sử dụng req.user.userId

    const result = await conversationService.getUnreadCount(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const conversationController = {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
}
