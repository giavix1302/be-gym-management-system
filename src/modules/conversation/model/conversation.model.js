import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'

const CONVERSATION_COLLECTION_NAME = 'conversations'
const CONVERSATION_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  trainerId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  firstBookingId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  lastMessage: Joi.string().trim().strict().allow('').default(''),
  lastMessageAt: Joi.date().timestamp('javascript').default(null),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await CONVERSATION_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    if (validData.userId) {
      validData.userId = new ObjectId(String(validData.userId))
    }

    if (validData.trainerId) {
      validData.trainerId = new ObjectId(String(validData.trainerId))
    }

    if (validData.firstBookingId) {
      validData.firstBookingId = new ObjectId(String(validData.firstBookingId))
    }

    const createdConversation = await GET_DB().collection(CONVERSATION_COLLECTION_NAME).insertOne(validData)
    return createdConversation
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (conversationId) => {
  try {
    const conversation = await GET_DB()
      .collection(CONVERSATION_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(conversationId)),
        _destroy: false,
      })
    return conversation
  } catch (error) {
    throw new Error(error)
  }
}

const findByUserAndTrainer = async (userId, trainerId) => {
  try {
    const conversation = await GET_DB()
      .collection(CONVERSATION_COLLECTION_NAME)
      .findOne({
        userId: new ObjectId(String(userId)),
        trainerId: new ObjectId(String(trainerId)),
        _destroy: false,
      })
    return conversation
  } catch (error) {
    throw new Error(error)
  }
}

const getConversationsByUserId = async (userId, page = 1, limit = 20, role = 'user') => {
  try {
    const skip = (page - 1) * limit

    // Logic đơn giản với role
    let matchCondition

    if (role === 'pt') {
      // Nếu là PT: Tìm trainer record rồi match trainerId
      const trainer = await GET_DB()
        .collection('trainers')
        .findOne({
          userId: new ObjectId(String(userId)),
        })

      if (!trainer) {
        console.log('🚀 ~ PT not found in trainers collection')
        return {
          conversations: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        }
      }

      // PT có thể có conversations ở 2 vai trò:
      // 1. Là customer (userId)
      // 2. Là trainer (trainerId)
      matchCondition = {
        $or: [{ userId: new ObjectId(String(userId)) }, { trainerId: trainer._id }],
        _destroy: false,
      }
    } else {
      // Nếu là user thường: chỉ tìm conversations where là customer
      matchCondition = {
        userId: new ObjectId(String(userId)),
        _destroy: false,
      }
    }

    const conversations = await GET_DB()
      .collection(CONVERSATION_COLLECTION_NAME)
      .aggregate([
        {
          $match: matchCondition,
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $lookup: {
            from: 'trainers',
            localField: 'trainerId',
            foreignField: '_id',
            as: 'trainerData',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'trainerData.userId',
            foreignField: '_id',
            as: 'trainerUser',
          },
        },
        // ✅ THÊM: Lookup để lấy tin nhắn cuối cùng và senderId
        {
          $lookup: {
            from: 'messages',
            let: { conversationId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$conversationId', '$$conversationId'] }, { $eq: ['$_destroy', false] }],
                  },
                },
              },
              { $sort: { createdAt: -1 } }, // Lấy tin nhắn mới nhất
              { $limit: 1 }, // Chỉ lấy 1 tin nhắn cuối
              {
                $project: {
                  senderId: 1,
                  content: 1,
                  createdAt: 1,
                },
              },
            ],
            as: 'lastMessageData',
          },
        },
        {
          $lookup: {
            from: 'messages',
            let: { conversationId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$conversationId', '$$conversationId'] },
                      { $ne: ['$senderId', new ObjectId(String(userId))] },
                      { $eq: ['$isRead', false] },
                    ],
                  },
                },
              },
              { $count: 'unreadCount' },
            ],
            as: 'unreadMessages',
          },
        },
        {
          $addFields: {
            user: { $arrayElemAt: ['$user', 0] },
            trainerData: { $arrayElemAt: ['$trainerData', 0] },
            trainerUser: { $arrayElemAt: ['$trainerUser', 0] },
            // ✅ THÊM: Thêm lastSenderId từ tin nhắn cuối cùng
            lastSenderId: { $arrayElemAt: ['$lastMessageData.senderId', 0] },
            unreadCount: {
              $ifNull: [{ $arrayElemAt: ['$unreadMessages.unreadCount', 0] }, 0],
            },
            displayMessage: {
              $cond: {
                if: {
                  $or: [{ $eq: ['$lastMessage', ''] }, { $eq: ['$lastMessage', null] }, { $not: ['$lastMessage'] }],
                },
                then: 'Bắt đầu cuộc hội thoại...',
                else: '$lastMessage',
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            userInfo: {
              userId: '$userId',
              fullName: { $ifNull: ['$user.fullName', ''] },
              avatar: { $ifNull: ['$user.avatar', ''] },
            },
            trainerInfo: {
              trainerId: '$trainerId',
              fullName: { $ifNull: ['$trainerUser.fullName', ''] },
              avatar: { $ifNull: ['$trainerUser.avatar', ''] },
            },
            lastMessage: '$displayMessage',
            lastSenderId: 1, // ✅ THÊM: Include lastSenderId trong kết quả
            lastMessageAt: 1,
            createdAt: 1,
            unreadCount: 1,
          },
        },
        {
          $sort: {
            lastMessageAt: -1,
            createdAt: -1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray()

    // Count query tương tự
    const total = await GET_DB().collection(CONVERSATION_COLLECTION_NAME).countDocuments(matchCondition)

    return {
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateLastMessage = async (conversationId, lastMessage) => {
  try {
    const updatedConversation = await GET_DB()
      .collection(CONVERSATION_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(conversationId)) },
        {
          $set: {
            lastMessage,
            lastMessageAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      )
    return updatedConversation
  } catch (error) {
    throw new Error(error)
  }
}

const deleteConversation = async (conversationId) => {
  try {
    const result = await GET_DB()
      .collection(CONVERSATION_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(String(conversationId)) })
    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

const softDeleteConversation = async (conversationId) => {
  try {
    const updatedConversation = await GET_DB()
      .collection(CONVERSATION_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(conversationId)) },
        {
          $set: {
            _destroy: true,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      )
    return updatedConversation
  } catch (error) {
    throw new Error(error)
  }
}

export const conversationModel = {
  CONVERSATION_COLLECTION_NAME,
  CONVERSATION_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  findByUserAndTrainer,
  getConversationsByUserId,
  updateLastMessage,
  deleteConversation,
  softDeleteConversation,
}
