import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb.config'
import Joi from 'joi'

// Collection name
const GYM_INFO_COLLECTION_NAME = 'gym_info'

// Collection schema
const GYM_INFO_COLLECTION_SCHEMA = Joi.object({
  key: Joi.string().required(),
  value: Joi.string().required(),
  category: Joi.string().valid('basic_info', 'contact', 'policies', 'pricing').default('basic_info'),
  displayFormat: Joi.string().valid('text', 'html', 'json').default('text'),
  isActive: Joi.boolean().default(true),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

// Validate data before create
const validateBeforeCreate = async (data) => {
  return await GYM_INFO_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(GYM_INFO_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (infoId) => {
  try {
    const result = await GET_DB()
      .collection(GYM_INFO_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(infoId),
        _destroy: false,
      })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getInfoByKey = async (key) => {
  try {
    const result = await GET_DB().collection(GYM_INFO_COLLECTION_NAME).findOne({
      key,
      isActive: true,
      _destroy: false,
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getAllInfo = async () => {
  try {
    const result = await GET_DB()
      .collection(GYM_INFO_COLLECTION_NAME)
      .find({
        isActive: true,
        _destroy: false,
      })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getInfoByCategory = async (category) => {
  try {
    const result = await GET_DB()
      .collection(GYM_INFO_COLLECTION_NAME)
      .find({
        category,
        isActive: true,
        _destroy: false,
      })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (infoId, updateData) => {
  try {
    const result = await GET_DB()
      .collection(GYM_INFO_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(infoId) },
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

const updateInfoByKey = async (key, updateData) => {
  try {
    const result = await GET_DB()
      .collection(GYM_INFO_COLLECTION_NAME)
      .findOneAndUpdate(
        { key },
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

const searchInfo = async (searchTerm) => {
  try {
    const result = await GET_DB()
      .collection(GYM_INFO_COLLECTION_NAME)
      .find({
        isActive: true,
        _destroy: false,
        $or: [{ key: { $regex: searchTerm, $options: 'i' } }, { value: { $regex: searchTerm, $options: 'i' } }],
      })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const softDeleteInfo = async (infoId) => {
  try {
    const result = await GET_DB()
      .collection(GYM_INFO_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(infoId) },
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

const deleteInfo = async (infoId) => {
  try {
    const result = await GET_DB()
      .collection(GYM_INFO_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(infoId) })
    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

const toggleInfoStatus = async (infoId, isActive) => {
  try {
    const result = await GET_DB()
      .collection(GYM_INFO_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(infoId) },
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

const bulkCreateInfo = async (infoArray) => {
  try {
    const validatedData = []
    for (const info of infoArray) {
      const validData = await validateBeforeCreate(info)
      validatedData.push(validData)
    }

    const result = await GET_DB().collection(GYM_INFO_COLLECTION_NAME).insertMany(validatedData)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const bulkUpdateInfo = async (updates) => {
  try {
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: new ObjectId(update.id) },
        update: {
          $set: {
            ...update.data,
            updatedAt: Date.now(),
          },
        },
      },
    }))

    const result = await GET_DB().collection(GYM_INFO_COLLECTION_NAME).bulkWrite(bulkOps)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getInfoKeys = async () => {
  try {
    const result = await GET_DB().collection(GYM_INFO_COLLECTION_NAME).distinct('key', {
      isActive: true,
      _destroy: false,
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getInfoCategories = async () => {
  try {
    const result = await GET_DB().collection(GYM_INFO_COLLECTION_NAME).distinct('category', {
      isActive: true,
      _destroy: false,
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const checkKeyExists = async (key, excludeId = null) => {
  try {
    let query = {
      key,
      _destroy: false,
    }

    if (excludeId) {
      query._id = { $ne: new ObjectId(excludeId) }
    }

    const result = await GET_DB().collection(GYM_INFO_COLLECTION_NAME).findOne(query)
    return !!result
  } catch (error) {
    throw new Error(error)
  }
}

export const gymInfoModel = {
  GYM_INFO_COLLECTION_NAME,
  GYM_INFO_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getInfoByKey,
  getAllInfo,
  getInfoByCategory,
  updateInfo,
  updateInfoByKey,
  searchInfo,
  softDeleteInfo,
  deleteInfo,
  toggleInfoStatus,
  bulkCreateInfo,
  bulkUpdateInfo,
  getInfoKeys,
  getInfoCategories,
  checkKeyExists,
}
