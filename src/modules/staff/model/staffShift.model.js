import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const STAFF_SHIFT_COLLECTION_NAME = 'staff_shifts'
const STAFF_SHIFT_COLLECTION_SCHEMA = Joi.object({
  staffId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  checkinTime: Joi.string().isoDate().allow('').default(''),
  checkoutTime: Joi.string().isoDate().allow('').default(''),
  hours: Joi.number().default(0),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await STAFF_SHIFT_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    // Convert staffId to ObjectId
    const staffShiftData = {
      ...validData,
      staffId: new ObjectId(String(validData.staffId)),
    }

    const createdStaffShift = await GET_DB().collection(STAFF_SHIFT_COLLECTION_NAME).insertOne(staffShiftData)
    return createdStaffShift
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (id) => {
  try {
    const db = await GET_DB()
    const detail = await db
      .collection(STAFF_SHIFT_COLLECTION_NAME)
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
            localField: 'staffId',
            foreignField: '_id',
            as: 'staffInfo',
          },
        },
        {
          $addFields: {
            staffInfo: { $arrayElemAt: ['$staffInfo', 0] },
          },
        },
      ])
      .toArray()

    return detail[0] || null
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailByStaffId = async (staffId) => {
  try {
    const db = await GET_DB()
    const detail = await db
      .collection(STAFF_SHIFT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            staffId: new ObjectId(String(staffId)),
            _destroy: false,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'staffId',
            foreignField: '_id',
            as: 'staffInfo',
          },
        },
        {
          $addFields: {
            staffInfo: { $arrayElemAt: ['$staffInfo', 0] },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
      ])
      .toArray()

    return detail[0] || null
  } catch (error) {
    throw new Error(error)
  }
}

const getListByStaffId = async (staffId) => {
  try {
    const db = await GET_DB()
    const shifts = await db
      .collection(STAFF_SHIFT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            staffId: new ObjectId(String(staffId)),
            _destroy: false,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'staffId',
            foreignField: '_id',
            as: 'staffInfo',
          },
        },
        {
          $addFields: {
            staffInfo: { $arrayElemAt: ['$staffInfo', 0] },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray()

    return shifts
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (staffId, updateData) => {
  try {
    const updatedStaffShift = await GET_DB()
      .collection(STAFF_SHIFT_COLLECTION_NAME)
      .findOneAndUpdate(
        { staffId: new ObjectId(String(staffId)), _destroy: false },
        { $set: updateData },
        { returnDocument: 'after' }
      )
    return updatedStaffShift
  } catch (error) {
    throw new Error(error)
  }
}

export const staffShiftModel = {
  STAFF_SHIFT_COLLECTION_NAME,
  STAFF_SHIFT_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getDetailByStaffId,
  getListByStaffId,
  updateInfo,
}
