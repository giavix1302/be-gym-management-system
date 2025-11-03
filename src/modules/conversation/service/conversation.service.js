import { conversationModel } from '../model/conversation.model'
import { userModel } from '~/modules/user/model/user.model'
import { bookingModel } from '~/modules/booking/model/booking.model'
import { sanitize } from '~/utils/utils'
import { messageModel } from '~/modules/message/model/message.model'
import { GET_DB } from '~/config/mongodb.config.js'
import { ObjectId } from 'mongodb'

// Helper function để check xem user có phải participant không
const isUserParticipant = async (conversation, userId, userRole) => {
  const conversationUserId = conversation.userId ? conversation.userId.toString() : null
  const conversationTrainerId = conversation.trainerId ? conversation.trainerId.toString() : null
  const currentUserId = userId ? userId.toString() : null

  console.log('🚀 ~ isUserParticipant DEBUG:', {
    conversationUserId,
    conversationTrainerId,
    currentUserId,
    userRole,
  })

  // Nếu user là customer (role: "user")
  if (userRole === 'user') {
    const result = conversationUserId === currentUserId
    console.log('🚀 ~ User role check result:', result)
    return result
  }

  // Nếu user là PT (role: "pt")
  if (userRole === 'pt') {
    // Kiểm tra nếu PT là customer trong conversation này
    if (conversationUserId === currentUserId) {
      console.log('🚀 ~ PT is customer in this conversation')
      return true
    }

    // conversation.trainerId lưu trainer record ID
    // Cần lấy trainer record và so sánh trainer.userId với currentUserId
    try {
      console.log('🚀 ~ Looking up trainer with ID:', conversationTrainerId)

      const trainer = await GET_DB()
        .collection('trainers')
        .findOne({
          _id: new ObjectId(String(conversationTrainerId)),
        })

      console.log(
        '🚀 ~ Found trainer:',
        trainer
          ? {
              _id: trainer._id.toString(),
              userId: trainer.userId.toString(),
            }
          : null
      )

      if (trainer && trainer.userId) {
        const isTrainerMatch = trainer.userId.toString() === currentUserId
        console.log('🚀 ~ Trainer match result:', isTrainerMatch)
        return isTrainerMatch
      }
    } catch (error) {
      console.error('🚀 ~ Error checking trainer participant:', error)
    }
  }

  console.log('🚀 ~ No participant match found')
  return false
}

const createOrGetConversation = async (data) => {
  try {
    const { trainerId, bookingId } = data
    const userId = data.userId // Get from auth middleware

    // Validate user exists
    const isUserExist = await userModel.getDetailById(userId)
    if (isUserExist === null) return { success: false, message: 'User not found' }

    // Validate trainer exists
    const isTrainerExist = await userModel.getDetailById(trainerId)
    if (isTrainerExist === null) return { success: false, message: 'Trainer not found' }

    // Validate booking exists and belongs to user and trainer
    const isBookingExist = await bookingModel.getDetailById(bookingId)
    if (isBookingExist === null) return { success: false, message: 'Booking not found' }

    // Check if booking belongs to the user and trainer
    if (isBookingExist.userId.toString() !== userId.toString()) {
      return { success: false, message: 'Booking does not belong to this user' }
    }

    // Check if conversation already exists
    const existingConversation = await conversationModel.findByUserAndTrainer(userId, trainerId)

    if (existingConversation) {
      return {
        success: true,
        message: 'Conversation already exists',
        data: sanitize(existingConversation),
        isNew: false,
      }
    }

    // Create new conversation
    const dataToSave = {
      userId,
      trainerId,
      firstBookingId: bookingId,
    }

    const result = await conversationModel.createNew(dataToSave)
    const createdConversation = await conversationModel.getDetailById(result.insertedId)

    return {
      success: true,
      message: 'Conversation created successfully',
      data: sanitize(createdConversation),
      isNew: true,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getConversationsByUserId = async (userId, page = 1, limit = 20, role = 'user') => {
  console.log('🚀 ~ getConversationsByUserId ~ params:', { userId, role })
  try {
    // Chuyển đổi page và limit thành số
    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 20

    // Validate user exists
    const isUserExist = await userModel.getDetailById(userId)
    if (isUserExist === null) return { success: false, message: 'User not found' }

    // Truyền role vào model
    const result = await conversationModel.getConversationsByUserId(userId, pageNum, limitNum, role)
    console.log('🚀 ~ getConversationsByUserId ~ result:', result)

    return {
      success: true,
      message: 'Conversations retrieved successfully',
      data: result.conversations.map((conversation) => sanitize(conversation)),
      pagination: result.pagination,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getMessagesByConversationId = async (conversationId, userId, page = 1, limit = 50, userRole = null) => {
  try {
    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 1

    console.log('🚀 ~ getMessagesByConversationId ~ params:', {
      conversationId,
      userId,
      userRole,
    })

    // Check if conversation exists
    const conversation = await conversationModel.getDetailById(conversationId)
    if (conversation === null) {
      return { success: false, message: 'Conversation not found' }
    }

    console.log('🚀 ~ conversation found:', {
      userId: conversation.userId?.toString(),
      trainerId: conversation.trainerId?.toString(),
    })

    // Sử dụng helper function để check participant
    const isParticipant = await isUserParticipant(conversation, userId, userRole)
    console.log('🚀 ~ isParticipant:', isParticipant)

    if (!isParticipant) {
      return { success: false, message: 'You are not a participant in this conversation' }
    }

    const result = await messageModel.getMessagesByConversationId(conversationId, pageNum, limitNum)

    return {
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        conversationId,
        messages: result.messages.map((message) => sanitize(message)),
      },
      pagination: result.pagination,
    }
  } catch (error) {
    console.error('🚀 ~ getMessagesByConversationId error:', error)
    throw new Error(error)
  }
}

const sendMessage = async (conversationId, userId, content, userRole = null) => {
  try {
    console.log('🚀 ~ sendMessage ~ params:', {
      conversationId,
      userId,
      content,
      userRole,
    })

    // Check if conversation exists
    const conversation = await conversationModel.getDetailById(conversationId)
    if (conversation === null) {
      return { success: false, message: 'Conversation not found' }
    }

    console.log('🚀 ~ sendMessage conversation found:', {
      userId: conversation.userId?.toString(),
      trainerId: conversation.trainerId?.toString(),
    })

    // Sử dụng helper function để check participant
    const isParticipant = await isUserParticipant(conversation, userId, userRole)
    console.log('🚀 ~ sendMessage isParticipant:', isParticipant)

    if (!isParticipant) {
      return { success: false, message: 'You are not a participant in this conversation' }
    }

    // Determine sender type based on user role
    const senderType = userRole === 'pt' ? 'trainer' : 'user'

    // Create message
    const messageData = {
      conversationId,
      senderId: userId,
      senderType,
      content,
      isRead: false, // Will be marked as read by sender in separate call if needed
    }

    const result = await messageModel.createNew(messageData)
    const createdMessage = await messageModel.getDetailById(result.insertedId)

    // Update conversation's last message
    await conversationModel.updateLastMessage(conversationId, content)

    return {
      success: true,
      message: 'Message sent successfully',
      data: sanitize(createdMessage),
    }
  } catch (error) {
    console.error('🚀 ~ sendMessage error:', error)
    throw new Error(error)
  }
}

const markMessagesAsRead = async (conversationId, userId, messageIds, userRole = null) => {
  try {
    // Check if conversation exists
    const conversation = await conversationModel.getDetailById(conversationId)
    if (conversation === null) {
      return { success: false, message: 'Conversation not found' }
    }

    // Sử dụng helper function để check participant
    const isParticipant = await isUserParticipant(conversation, userId, userRole)
    if (!isParticipant) {
      return { success: false, message: 'You are not a participant in this conversation' }
    }

    // Mark messages as read
    const updatedCount = await messageModel.markMessagesAsRead(messageIds)

    return {
      success: true,
      message: 'Messages marked as read',
      data: {
        updatedCount,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getUnreadCount = async (userId) => {
  try {
    // Validate user exists
    const isUserExist = await userModel.getDetailById(userId)
    if (isUserExist === null) return { success: false, message: 'User not found' }

    const result = await messageModel.getUnreadCount(userId)

    return {
      success: true,
      message: 'Unread count retrieved successfully',
      data: result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const conversationService = {
  createOrGetConversation,
  getConversationsByUserId,
  getMessagesByConversationId,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
}
