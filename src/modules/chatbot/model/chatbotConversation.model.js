import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb.config'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import Joi from 'joi'

// Collection name
const CHATBOT_CONVERSATIONS_COLLECTION_NAME = 'chatbot_conversations'

// Collection schema
const CHATBOT_CONVERSATIONS_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null),
  sessionId: Joi.string().required(),
  userType: Joi.string().valid('anonymous', 'authenticated').default('anonymous'),
  anonymousId: Joi.string().allow(null),
  messages: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid('user', 'bot').required(),
        content: Joi.string().required(),
        timestamp: Joi.date().default(Date.now),
        intent: Joi.string().allow(''),
        confidence: Joi.number().min(0).max(1).allow(null),
      })
    )
    .default([]),
  status: Joi.string().valid('active', 'ended').default('active'),
  lastActiveAt: Joi.date().timestamp('javascript').default(Date.now),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

// Validate data before create
const validateBeforeCreate = async (data) => {
  return await CHATBOT_CONVERSATIONS_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(CHATBOT_CONVERSATIONS_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (conversationId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_CONVERSATIONS_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(conversationId),
        _destroy: false,
      })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getActiveConversationByUser = async (userId, userType = 'authenticated') => {
  try {
    let query = {
      status: 'active',
      userType,
      _destroy: false,
    }

    if (userType === 'authenticated') {
      query.userId = userId
    } else {
      query.anonymousId = userId
    }

    const result = await GET_DB()
      .collection(CHATBOT_CONVERSATIONS_COLLECTION_NAME)
      .findOne(query, { sort: { lastActiveAt: -1 } })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (conversationId, updateData) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_CONVERSATIONS_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(conversationId)) },
        {
          $set: {
            ...updateData,
            lastActiveAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        { returnDocument: 'after' }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const addMessageToConversation = async (conversationId, message) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_CONVERSATIONS_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(conversationId)) },
        {
          $push: { messages: message },
          $set: {
            lastActiveAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        { returnDocument: 'after' }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getAllConversations = async () => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_CONVERSATIONS_COLLECTION_NAME)
      .find({ _destroy: false })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getConversationsByUserId = async (userId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_CONVERSATIONS_COLLECTION_NAME)
      .find({
        userId: new ObjectId(String(userId)),
        _destroy: false,
      })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const softDeleteConversation = async (conversationId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_CONVERSATIONS_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(conversationId) },
        {
          $set: {
            _destroy: true,
            updatedAt: Date.now(),
          },
        },
        { returnDocument: 'after' }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteConversation = async (conversationId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_CONVERSATIONS_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(conversationId) })
    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

const endConversation = async (conversationId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_CONVERSATIONS_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(conversationId) },
        {
          $set: {
            status: 'ended',
            updatedAt: Date.now(),
          },
        },
        { returnDocument: 'after' }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const chatbotConversationModel = {
  CHATBOT_CONVERSATIONS_COLLECTION_NAME,
  CHATBOT_CONVERSATIONS_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getActiveConversationByUser,
  updateInfo,
  addMessageToConversation,
  getAllConversations,
  getConversationsByUserId,
  softDeleteConversation,
  deleteConversation,
  endConversation,
}
