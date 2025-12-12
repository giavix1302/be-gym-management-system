import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'
import { classSessionModel } from '~/modules/classSession/model/classSession.model'

const ROOM_COLLECTION_NAME = 'rooms'
const ROOM_COLLECTION_SCHEMA = Joi.object({
  locationId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  name: Joi.string().trim().strict().default(''),
  capacity: Joi.number().min(1).required(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await ROOM_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data, { abortEarly: false })

    if (validData.locationId) {
      validData.locationId = new ObjectId(String(validData.locationId))
    }

    const createdUser = await GET_DB().collection(ROOM_COLLECTION_NAME).insertOne(validData)
    return createdUser
  } catch (error) {
    throw new Error(error)
  }
}

const getDetail = async (_id) => {
  try {
    const user = GET_DB()
      .collection(ROOM_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(_id)),
      })
    return user
  } catch (error) {
    throw new Error(error)
  }
}

const getAllRooms = async () => {
  try {
    const rooms = GET_DB().collection(ROOM_COLLECTION_NAME).find({}).toArray()
    return rooms
  } catch (error) {
    throw new Error(error)
  }
}

// Method chính - format đơn giản
const getListRoomWithClassSessionsByLocationId = async (locationId) => {
  try {
    const db = GET_DB()

    // Tính toán ngày 7 ngày trước để filter buổi học quá khứ
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    const rooms = await db
      .collection(ROOM_COLLECTION_NAME)
      .aggregate([
        // Match rooms theo locationId và không bị xóa
        {
          $match: {
            locationId: new ObjectId(String(locationId)),
            _destroy: false,
          },
        },
        // Lookup class sessions cho mỗi room
        {
          $lookup: {
            from: 'class_sessions', // CLASS_SESSION_COLLECTION_NAME
            let: { roomId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$roomId', '$$roomId'] },
                      { $eq: ['$_destroy', false] },
                      // Điều kiện: Lấy các buổi học từ 7 ngày trước trở đi
                      { $gte: [{ $dateFromString: { dateString: '$startTime' } }, new Date(sevenDaysAgoISO)] },
                    ],
                  },
                },
              },
              // Project chỉ những field cần thiết cho session
              {
                $project: {
                  _id: 1,
                  classId: 1,
                  hours: 1,
                  startTime: 1,
                  endTime: 1,
                  trainers: 1,
                  users: 1,
                  title: 1,
                },
              },
              // Sort sessions by start time
              {
                $sort: { startTime: 1 },
              },
            ],
            as: 'classSession',
          },
        },
        // Project chỉ những field cần thiết cho room
        {
          $project: {
            _id: 1,
            name: 1,
            capacity: 1,
            classSession: 1,
          },
        },
        // Sort rooms by name
        {
          $sort: { name: 1 },
        },
      ])
      .toArray()

    return rooms
  } catch (error) {
    throw new Error(error)
  }
}

const deleteRoom = async (roomId) => {
  try {
    // Check if room exists
    const result = await GET_DB()
      .collection(ROOM_COLLECTION_NAME)
      .findOneAndDelete({ _id: new ObjectId(String(roomId)) }, { returnDocument: ReturnDocument.AFTER })

    if (result.value === null) {
      return null
    }

    return result.value
  } catch (error) {
    throw new Error(error)
  }
}

const softDeleteRoom = async (roomId) => {
  try {
    const result = await GET_DB()
      .collection(ROOM_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(roomId)) },
        { $set: { _destroy: true, updatedAt: Date.now() } },
        { returnDocument: ReturnDocument.AFTER }
      )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Cập nhật export roomModel
export const roomModel = {
  ROOM_COLLECTION_NAME,
  ROOM_COLLECTION_SCHEMA,
  createNew,
  getDetail,
  getAllRooms,
  getListRoomWithClassSessionsByLocationId, // Thêm method chính
  deleteRoom,
  softDeleteRoom,
}
