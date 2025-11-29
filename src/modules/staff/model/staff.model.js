import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { STAFF_TYPE } from '~/utils/constants.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const STAFF_COLLECTION_NAME = 'staffs'
const STAFF_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  locationId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),

  citizenId: Joi.string().required().trim().strict(),
  positionName: Joi.string().valid(STAFF_TYPE.RECEPTIONIST, STAFF_TYPE.CLEANER).required(),
  hourlyRate: Joi.number().min(0).required(), // lương 1 giờ
  hoursWorked: Joi.number().precision(2), // số  làm việc

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await STAFF_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    // Convert userId and locationId to ObjectId
    const staffData = {
      ...validData,
      userId: new ObjectId(String(validData.userId)),
      locationId: new ObjectId(String(validData.locationId)),
    }

    const createdStaff = await GET_DB().collection(STAFF_COLLECTION_NAME).insertOne(staffData)
    return createdStaff
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (id) => {
  try {
    const db = await GET_DB()
    const detail = await db
      .collection(STAFF_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            _id: new ObjectId(String(id)),
            _destroy: false,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'locationId',
            foreignField: '_id',
            as: 'locationInfo',
          },
        },
        {
          $addFields: {
            userInfo: { $arrayElemAt: ['$userInfo', 0] },
            locationInfo: { $arrayElemAt: ['$locationInfo', 0] },
          },
        },
      ])
      .toArray()

    return detail[0] || null
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailByUserId = async (userId) => {
  try {
    const db = await GET_DB()
    const detail = await db
      .collection(STAFF_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            userId: new ObjectId(String(userId)),
            _destroy: false,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'locationId',
            foreignField: '_id',
            as: 'locationInfo',
          },
        },
        {
          $addFields: {
            userInfo: { $arrayElemAt: ['$userInfo', 0] },
            locationInfo: { $arrayElemAt: ['$locationInfo', 0] },
          },
        },
      ])
      .toArray()

    return detail[0] || null
  } catch (error) {
    throw new Error(error)
  }
}

const getList = async () => {
  try {
    const listStaff = await GET_DB().collection(STAFF_COLLECTION_NAME).find({ _destroy: false }).toArray()
    return listStaff
  } catch (error) {
    throw new Error(error)
  }
}

const getListWithDetails = async () => {
  try {
    const db = await GET_DB()
    const listStaff = await db
      .collection(STAFF_COLLECTION_NAME)
      .aggregate([
        {
          $match: { _destroy: false },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'locationId',
            foreignField: '_id',
            as: 'locationInfo',
          },
        },
        {
          $addFields: {
            userInfo: { $arrayElemAt: ['$userInfo', 0] },
            locationInfo: { $arrayElemAt: ['$locationInfo', 0] },
          },
        },
      ])
      .toArray()

    return listStaff
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (staffId, updateData) => {
  try {
    // Convert userId and locationId to ObjectId if they exist in updateData
    const dataToUpdate = { ...updateData }
    if (dataToUpdate.userId) {
      dataToUpdate.userId = new ObjectId(String(dataToUpdate.userId))
    }
    if (dataToUpdate.locationId) {
      dataToUpdate.locationId = new ObjectId(String(dataToUpdate.locationId))
    }

    const updatedStaff = await GET_DB()
      .collection(STAFF_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(staffId)), _destroy: false },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      )
    return updatedStaff
  } catch (error) {
    throw new Error(error)
  }
}

const deleteStaff = async (staffId) => {
  try {
    const result = await GET_DB()
      .collection(STAFF_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(staffId)) },
        { $set: { _destroy: true, updatedAt: Date.now() } },
        { returnDocument: 'after' }
      )
    return result ? 1 : 0
  } catch (error) {
    throw new Error(error)
  }
}

const hardDelete = async (staffId) => {
  try {
    const result = await GET_DB()
      .collection(STAFF_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(String(staffId)) })
    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

export const staffModel = {
  STAFF_COLLECTION_NAME,
  STAFF_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getDetailByUserId,
  getList,
  getListWithDetails,
  updateInfo,
  deleteStaff,
  hardDelete,
}
