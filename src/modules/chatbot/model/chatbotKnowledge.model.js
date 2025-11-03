import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb.config'
import Joi from 'joi'

// Collection name
const CHATBOT_KNOWLEDGE_COLLECTION_NAME = 'chatbot_knowledge_base'

// Collection schema
const CHATBOT_KNOWLEDGE_COLLECTION_SCHEMA = Joi.object({
  question: Joi.string().required(),
  answer: Joi.string().required(),
  category: Joi.string()
    .valid('operating_hours', 'contact', 'policies', 'membership', 'classes', 'trainers', 'equipment')
    .required(),
  keywords: Joi.array().items(Joi.string()).default([]),
  priority: Joi.number().integer().min(1).max(10).default(5),
  isActive: Joi.boolean().default(true),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

// Validate data before create
const validateBeforeCreate = async (data) => {
  return await CHATBOT_KNOWLEDGE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (knowledgeId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(knowledgeId),
        _destroy: false,
      })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const searchKnowledge = async (keywords, category = null) => {
  try {
    let query = {
      isActive: true,
      _destroy: false,
      $or: [
        { keywords: { $in: keywords } },
        { question: { $regex: keywords.join('|'), $options: 'i' } },
        { answer: { $regex: keywords.join('|'), $options: 'i' } },
      ],
    }

    if (category) {
      query.category = category
    }

    const result = await GET_DB()
      .collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME)
      .find(query)
      .sort({ priority: -1 })
      .limit(5)
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getAllKnowledge = async () => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME)
      .find({
        isActive: true,
        _destroy: false,
      })
      .sort({ priority: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getKnowledgeByCategory = async (category) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME)
      .find({
        category,
        isActive: true,
        _destroy: false,
      })
      .sort({ priority: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (knowledgeId, updateData) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(knowledgeId) },
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

const softDeleteKnowledge = async (knowledgeId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(knowledgeId) },
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

const deleteKnowledge = async (knowledgeId) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(knowledgeId) })
    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

const toggleKnowledgeStatus = async (knowledgeId, isActive) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(knowledgeId) },
        {
          $set: {
            isActive,
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

const bulkUpdatePriority = async (updates) => {
  try {
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: new ObjectId(update.id) },
        update: {
          $set: {
            priority: update.priority,
            updatedAt: Date.now(),
          },
        },
      },
    }))

    const result = await GET_DB().collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME).bulkWrite(bulkOps)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const searchByKeyword = async (keyword, limit = 10) => {
  try {
    const result = await GET_DB()
      .collection(CHATBOT_KNOWLEDGE_COLLECTION_NAME)
      .find({
        isActive: true,
        _destroy: false,
        $or: [{ keywords: { $regex: keyword, $options: 'i' } }, { question: { $regex: keyword, $options: 'i' } }],
      })
      .sort({ priority: -1 })
      .limit(limit)
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const chatbotKnowledgeModel = {
  CHATBOT_KNOWLEDGE_COLLECTION_NAME,
  CHATBOT_KNOWLEDGE_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  searchKnowledge,
  getAllKnowledge,
  getKnowledgeByCategory,
  updateInfo,
  softDeleteKnowledge,
  deleteKnowledge,
  toggleKnowledgeStatus,
  bulkUpdatePriority,
  searchByKeyword,
}
