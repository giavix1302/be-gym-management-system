import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb.config'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import Joi from 'joi'

// Collection name
const CHATBOT_ACTIONS_COLLECTION_NAME = 'chatbot_actions'

// Collection schema
const CHATBOT_ACTIONS_COLLECTION_SCHEMA = Joi.object({
  actionType: Joi.string()
    .valid('book_class', 'cancel_booking', 'check_membership', 'get_trainer_info', 'check_schedule', 'contact_staff')
    .required(),
  userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null),
  conversationId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null),
  parameters: Joi.object().default({}),
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'failed').default('pending'),
  result: Joi.object().allow(null),
  errorMessage: Joi.string().allow(''),
  completedAt: Joi.date().timestamp('javascript').allow(null),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

// Validate data before create
const validateBeforeCreate = async (data) => {
  return await CHATBOT_ACTIONS_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(CHATBOT_ACTIONS_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (actionId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(actionId),
        _destroy: false,
      })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (actionId, updateData) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(actionId) },
        {
          $set: {
            ...updateData,
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

const getActionsByUserId = async (userId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .find({
        userId: new ObjectId(userId),
        _destroy: false,
      })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getActionsByConversationId = async (conversationId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .find({
        conversationId: new ObjectId(conversationId),
        _destroy: false,
      })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getActionsByType = async (actionType, userId = null) => {
  try {
    let query = {
      actionType,
      _destroy: false,
    }

    if (userId) {
      query.userId = new ObjectId(userId)
    }

    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getActionsByStatus = async (status, userId = null) => {
  try {
    let query = {
      status,
      _destroy: false,
    }

    if (userId) {
      query.userId = new ObjectId(userId)
    }

    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getAllActions = async () => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .find({ _destroy: false })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getPendingActions = async (userId = null) => {
  try {
    let query = {
      status: 'pending',
      _destroy: false,
    }

    if (userId) {
      query.userId = new ObjectId(userId)
    }

    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: 1 }) // Oldest first for processing
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const markActionAsCompleted = async (actionId, result = null) => {
  try {
    const updateData = {
      status: 'completed',
      completedAt: Date.now(),
      updatedAt: Date.now(),
    }

    if (result) {
      updateData.result = result
    }

    const updatedAction = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .findOneAndUpdate({ _id: new ObjectId(actionId) }, { $set: updateData }, { returnDocument: 'after' })
    return updatedAction
  } catch (error) {
    throw new Error(error)
  }
}

const markActionAsFailed = async (actionId, errorMessage) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(actionId) },
        {
          $set: {
            status: 'failed',
            errorMessage,
            completedAt: Date.now(),
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

const softDeleteAction = async (actionId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(actionId) },
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

const deleteAction = async (actionId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(actionId) })
    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

const getActionStatistics = async (userId = null, dateRange = null) => {
  try {
    let matchQuery = { _destroy: false }

    if (userId) {
      matchQuery.userId = new ObjectId(userId)
    }

    if (dateRange) {
      matchQuery.createdAt = {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate,
      }
    }

    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              actionType: '$actionType',
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.actionType',
            statuses: {
              $push: {
                status: '$_id.status',
                count: '$count',
              },
            },
            totalCount: { $sum: '$count' },
          },
        },
      ])
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const cleanupOldActions = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await GET_DB()
      .collection(CHATBOT_ACTIONS_COLLECTION_NAME)
      .deleteMany({
        createdAt: { $lt: cutoffDate.getTime() },
        status: { $in: ['completed', 'failed'] },
      })
    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

export const chatbotActionModel = {
  CHATBOT_ACTIONS_COLLECTION_NAME,
  CHATBOT_ACTIONS_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  updateInfo,
  getActionsByUserId,
  getActionsByConversationId,
  getActionsByType,
  getActionsByStatus,
  getAllActions,
  getPendingActions,
  markActionAsCompleted,
  markActionAsFailed,
  softDeleteAction,
  deleteAction,
  getActionStatistics,
  cleanupOldActions,
}
