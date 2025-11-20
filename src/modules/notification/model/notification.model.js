import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { NOTIFICATION_TYPE, REFERENCE_TYPE } from '~/utils/constants.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const NOTIFICATION_COLLECTION_NAME = 'notifications'
const NOTIFICATION_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  referenceId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  referenceType: Joi.string().valid(REFERENCE_TYPE.BOOKING, REFERENCE_TYPE.CLASS, REFERENCE_TYPE.MEMBERSHIP).required(),
  type: Joi.string()
    .valid(
      NOTIFICATION_TYPE.TRAINER_UPCOMING_BOOKING,
      NOTIFICATION_TYPE.TRAINER_UPCOMING_CLASS_SESSION,
      NOTIFICATION_TYPE.USER_MEMBERSHIP_EXPIRING,
      NOTIFICATION_TYPE.USER_UPCOMING_BOOKING,
      NOTIFICATION_TYPE.USER_UPCOMING_CLASS_SESSION
    )
    .required(),
  title: Joi.string().trim().strict().required(),
  message: Joi.string().trim().strict().required(),
  isRead: Joi.boolean().default(false),
  scheduledAt: Joi.date().timestamp('javascript').required(),
  sentAt: Joi.date().timestamp('javascript').required(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await NOTIFICATION_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data, { abortEarly: false })

    const newNotificationToAdd = {
      ...validData,
      userId: new ObjectId(String(validData.userId)),
      referenceId: new ObjectId(String(validData.referenceId)),
    }

    const createdNotification = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).insertOne(newNotificationToAdd)
    return createdNotification
  } catch (error) {
    throw new Error(error)
  }
}

const createBulk = async (notifications) => {
  try {
    const validatedNotifications = []

    for (const notification of notifications) {
      const validData = await validateBeforeCreate(notification, { abortEarly: false })
      validatedNotifications.push({
        ...validData,
        userId: new ObjectId(String(validData.userId)),
        referenceId: new ObjectId(String(validData.referenceId)),
      })
    }

    const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).insertMany(validatedNotifications)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (notificationId) => {
  try {
    const notification = await GET_DB()
      .collection(NOTIFICATION_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(notificationId)),
        _destroy: false,
      })
    return notification
  } catch (error) {
    throw new Error(error)
  }
}

const getUserNotifications = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false, type = null } = options

    const filter = {
      userId: new ObjectId(String(userId)),
      _destroy: false,
    }

    if (unreadOnly) {
      filter.isRead = false
    }

    if (type) {
      filter.type = type
    }

    const notifications = await GET_DB()
      .collection(NOTIFICATION_COLLECTION_NAME)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .toArray()

    return notifications
  } catch (error) {
    throw new Error(error)
  }
}

const getUnreadCount = async (userId) => {
  try {
    const count = await GET_DB()
      .collection(NOTIFICATION_COLLECTION_NAME)
      .countDocuments({
        userId: new ObjectId(String(userId)),
        isRead: false,
        _destroy: false,
      })
    return count
  } catch (error) {
    throw new Error(error)
  }
}

const markAsRead = async (notificationId) => {
  try {
    const result = await GET_DB()
      .collection(NOTIFICATION_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(notificationId)) },
        {
          $set: {
            isRead: true,
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

const markAllAsRead = async (userId) => {
  try {
    const result = await GET_DB()
      .collection(NOTIFICATION_COLLECTION_NAME)
      .updateMany(
        {
          userId: new ObjectId(String(userId)),
          isRead: false,
          _destroy: false,
        },
        {
          $set: {
            isRead: true,
            updatedAt: Date.now(),
          },
        }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteNotification = async (notificationId) => {
  try {
    const result = await GET_DB()
      .collection(NOTIFICATION_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(notificationId)) },
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

// Xóa notifications cũ hơn 7 ngày (để cleanup database)
const deleteOldNotifications = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const result = await GET_DB()
      .collection(NOTIFICATION_COLLECTION_NAME)
      .deleteMany({
        createdAt: { $lt: sevenDaysAgo },
      })

    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

// Xóa notifications theo reference (khi user hủy subscription, booking, etc.)
const deleteNotificationsByReference = async (referenceId, referenceType) => {
  try {
    const result = await GET_DB()
      .collection(NOTIFICATION_COLLECTION_NAME)
      .updateMany(
        {
          referenceId: new ObjectId(String(referenceId)),
          referenceType,
          _destroy: false,
        },
        {
          $set: {
            _destroy: true,
            updatedAt: Date.now(),
          },
        }
      )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Kiểm tra notification đã tồn tại chưa (để tránh duplicate)
const checkDuplicateNotification = async (userId, type, referenceId, timeWindow = null) => {
  try {
    const query = {
      userId: new ObjectId(String(userId)),
      type,
      referenceId: new ObjectId(String(referenceId)),
      _destroy: false,
    }

    // ✅ Nếu timeWindow = null, không giới hạn thời gian
    if (timeWindow !== null) {
      const timeWindowAgo = new Date(Date.now() - timeWindow * 60 * 1000)
      query.createdAt = { $gte: timeWindowAgo }
    }

    const existing = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).findOne(query)

    return existing !== null
  } catch (error) {
    throw new Error(error)
  }
}

export const notificationModel = {
  NOTIFICATION_COLLECTION_NAME,
  NOTIFICATION_COLLECTION_SCHEMA,
  createNew,
  createBulk,
  getDetailById,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteOldNotifications,
  deleteNotificationsByReference,
  checkDuplicateNotification,
}
