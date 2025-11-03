import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'

const MESSAGE_COLLECTION_NAME = 'messages'
const MESSAGE_COLLECTION_SCHEMA = Joi.object({
  conversationId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  senderId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  senderType: Joi.string().valid('user', 'trainer').required(),
  content: Joi.string().trim().strict().required(),
  timestamp: Joi.date().timestamp('javascript').default(Date.now),
  isRead: Joi.boolean().default(false),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await MESSAGE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    if (validData.conversationId) {
      validData.conversationId = new ObjectId(String(validData.conversationId))
    }

    if (validData.senderId) {
      validData.senderId = new ObjectId(String(validData.senderId))
    }

    const createdMessage = await GET_DB().collection(MESSAGE_COLLECTION_NAME).insertOne(validData)
    return createdMessage
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (messageId) => {
  try {
    const message = await GET_DB()
      .collection(MESSAGE_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(messageId)),
        _destroy: false,
      })
    return message
  } catch (error) {
    throw new Error(error)
  }
}

const getMessagesByConversationId = async (conversationId, page = 1, limit = 1) => {
  try {
    // Chuyển đổi page và limit thành số để tránh lỗi MongoDB
    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 1
    const skip = (pageNum - 1) * limitNum

    const messages = await GET_DB()
      .collection(MESSAGE_COLLECTION_NAME)
      .find({
        conversationId: new ObjectId(String(conversationId)),
        _destroy: false,
      })
      .sort({ timestamp: 1 }) // Ascending order (oldest first)
      .skip(skip)
      .limit(limitNum)
      .toArray()

    const total = await GET_DB()
      .collection(MESSAGE_COLLECTION_NAME)
      .countDocuments({
        conversationId: new ObjectId(String(conversationId)),
        _destroy: false,
      })

    return {
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const markMessagesAsRead = async (messageIds) => {
  try {
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return 0
    }

    const objectIds = messageIds.map((id) => new ObjectId(String(id)))

    const result = await GET_DB()
      .collection(MESSAGE_COLLECTION_NAME)
      .updateMany(
        {
          _id: { $in: objectIds },
          _destroy: false,
        },
        {
          $set: {
            isRead: true,
            updatedAt: new Date(),
          },
        }
      )
    return result.modifiedCount
  } catch (error) {
    throw new Error(error)
  }
}

const getUnreadCount = async (userId) => {
  try {
    const unreadData = await GET_DB()
      .collection(MESSAGE_COLLECTION_NAME)
      .aggregate([
        {
          $lookup: {
            from: 'conversations',
            localField: 'conversationId',
            foreignField: '_id',
            as: 'conversation',
          },
        },
        {
          $unwind: '$conversation',
        },
        {
          $match: {
            $and: [
              {
                $or: [
                  { 'conversation.userId': new ObjectId(String(userId)) },
                  { 'conversation.trainerId': new ObjectId(String(userId)) },
                ],
              },
              { senderId: { $ne: new ObjectId(String(userId)) } },
              { isRead: false },
              { _destroy: false },
              { 'conversation._destroy': false },
            ],
          },
        },
        {
          $group: {
            _id: '$conversationId',
            unreadCount: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            totalUnread: { $sum: '$unreadCount' },
            conversations: {
              $push: {
                conversationId: '$_id',
                unreadCount: '$unreadCount',
              },
            },
          },
        },
      ])
      .toArray()

    if (unreadData.length === 0) {
      return {
        totalUnread: 0,
        conversations: [],
      }
    }

    return {
      totalUnread: unreadData[0].totalUnread,
      conversations: unreadData[0].conversations,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteMessage = async (messageId) => {
  try {
    const result = await GET_DB()
      .collection(MESSAGE_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(String(messageId)) })
    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

const softDeleteMessage = async (messageId) => {
  try {
    const updatedMessage = await GET_DB()
      .collection(MESSAGE_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(messageId)) },
        {
          $set: {
            _destroy: true,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      )
    return updatedMessage
  } catch (error) {
    throw new Error(error)
  }
}

// Thêm hàm mới để lấy tin nhắn mới nhất của conversation
const getLatestMessageByConversationId = async (conversationId) => {
  try {
    const message = await GET_DB()
      .collection(MESSAGE_COLLECTION_NAME)
      .findOne(
        {
          conversationId: new ObjectId(String(conversationId)),
          _destroy: false,
        },
        {
          sort: { timestamp: -1 },
        }
      )
    return message
  } catch (error) {
    throw new Error(error)
  }
}

// Thêm hàm để đếm tin nhắn chưa đọc trong một conversation cụ thể
const getUnreadCountByConversation = async (conversationId, userId) => {
  try {
    const count = await GET_DB()
      .collection(MESSAGE_COLLECTION_NAME)
      .countDocuments({
        conversationId: new ObjectId(String(conversationId)),
        senderId: { $ne: new ObjectId(String(userId)) },
        isRead: false,
        _destroy: false,
      })
    return count
  } catch (error) {
    throw new Error(error)
  }
}

export const messageModel = {
  MESSAGE_COLLECTION_NAME,
  MESSAGE_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getMessagesByConversationId,
  markMessagesAsRead,
  getUnreadCount,
  deleteMessage,
  softDeleteMessage,
  getLatestMessageByConversationId,
  getUnreadCountByConversation,
}
