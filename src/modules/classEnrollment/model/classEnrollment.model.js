import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { BOOKING_STATUS, CLASS_ENROLLMENT_STATUS, PAYMENT_STATUS } from '~/utils/constants.js'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { classSessionModel } from '~/modules/classSession/model/classSession.model'
import { bookingModel } from '~/modules/booking/model/booking.model'

const CLASS_ENROLLMENT_COLLECTION_NAME = 'class_enrollments'
const CLASS_ENROLLMENT_COLLECTION_SCHEMA = Joi.object({
  classId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  enrolledAt: Joi.string().isoDate().allow('').default(''),
  status: Joi.string()
    .valid(
      CLASS_ENROLLMENT_STATUS.PENDING,
      CLASS_ENROLLMENT_STATUS.ACTIVE,
      CLASS_ENROLLMENT_STATUS.COMPLETED,
      CLASS_ENROLLMENT_STATUS.CANCELLED
    )
    .required(),

  paymentStatus: Joi.string().valid(PAYMENT_STATUS.PAID, PAYMENT_STATUS.UNPAID).required(),
  price: Joi.number().min(1).required(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await CLASS_ENROLLMENT_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data, { abortEarly: false })

    if (validData.classId) {
      validData.classId = new ObjectId(String(validData.classId))
    }

    if (validData.userId) {
      validData.userId = new ObjectId(String(validData.userId))
    }
    const createdMembership = await GET_DB().collection(CLASS_ENROLLMENT_COLLECTION_NAME).insertOne(validData)
    return createdMembership
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (classEnrollmentId) => {
  try {
    const db = await GET_DB()
    const detail = await db
      .collection(CLASS_ENROLLMENT_COLLECTION_NAME)
      .aggregate([
        {
          $match: { _id: new ObjectId(String(classEnrollmentId)) },
        },
        {
          $lookup: {
            from: 'classes',
            localField: 'classId',
            foreignField: '_id',
            as: 'classInfo',
          },
        },
        {
          $unwind: {
            path: '$classInfo',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'classInfo.locationId',
            foreignField: '_id',
            as: 'classInfo.location',
          },
        },
        {
          $unwind: {
            path: '$classInfo.location',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'classInfo.trainers',
            foreignField: '_id',
            as: 'classInfo.trainerDetails',
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
    const listLocation = await GET_DB().collection(CLASS_ENROLLMENT_COLLECTION_NAME).find({}).toArray()
    return listLocation
  } catch (error) {
    throw new Error(error)
  }
}

const getListWithQuantityUser = async () => {
  try {
    const db = await GET_DB()
    const listMembership = await db
      .collection(CLASS_ENROLLMENT_COLLECTION_NAME)
      .aggregate([
        {
          $lookup: {
            from: subscriptionModel.SUBSCRIPTION_COLLECTION_NAME,
            localField: '_id',
            foreignField: 'membershipId',
            as: 'subscriptions',
          },
        },
        {
          $addFields: {
            totalUsers: { $size: '$subscriptions' },
          },
        },
        {
          $project: {
            subscriptions: 0, // khÃ´ng cáº§n tráº£ vá» subscriptions chi tiáº¿t
          },
        },
      ])
      .toArray()

    return listMembership
  } catch (error) {
    throw new Error(error)
  }
}

const checkScheduleConflict = async (userId, classId) => {
  try {
    const db = await GET_DB()
    const now = new Date()
    const nowISO = now.toISOString()

    // Get all future class sessions for the target class
    const classSessions = await db
      .collection(classSessionModel.CLASS_SESSION_COLLECTION_NAME)
      .find({
        classId: new ObjectId(String(classId)),
        _destroy: false,
        startTime: { $gte: nowISO }, // Only future sessions
      })
      .toArray()

    // If no future sessions, no conflict possible
    if (!classSessions || classSessions.length === 0) {
      return null
    }

    // Get all future bookings for this user
    const userBookings = await db
      .collection(bookingModel.BOOKING_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            userId: new ObjectId(String(userId)),
            _destroy: false,
            status: { $ne: BOOKING_STATUS.CANCELLED },
          },
        },
        // Join with schedules to get timing info
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'schedule',
          },
        },
        {
          $unwind: '$schedule',
        },
        // Filter for future schedules only
        {
          $match: {
            'schedule._destroy': false,
            'schedule.startTime': { $gte: nowISO },
          },
        },
        {
          $project: {
            bookingId: '$_id',
            scheduleId: '$scheduleId',
            startTime: '$schedule.startTime',
            endTime: '$schedule.endTime',
            trainerId: '$schedule.trainerId',
          },
        },
      ])
      .toArray()

    // Check for conflicts between class sessions and user bookings
    for (const session of classSessions) {
      const sessionStart = new Date(session.startTime)
      const sessionEnd = new Date(session.endTime)

      for (const booking of userBookings) {
        const bookingStart = new Date(booking.startTime)
        const bookingEnd = new Date(booking.endTime)

        // Check for time overlap: session.start < booking.end && session.end > booking.start
        if (sessionStart < bookingEnd && sessionEnd > bookingStart) {
          // Conflict found - return detailed information
          return {
            hasConflict: true,
            conflictType: 'TRAINER_BOOKING_OVERLAP',
            message: 'Class session overlaps with existing trainer booking',
            classSession: {
              sessionId: session._id,
              startTime: session.startTime,
              endTime: session.endTime,
              title: session.title,
            },
            existingBooking: {
              bookingId: booking.bookingId,
              scheduleId: booking.scheduleId,
              trainerId: booking.trainerId,
              startTime: booking.startTime,
              endTime: booking.endTime,
            },
          }
        }
      }
    }

    // No conflicts found
    return null
  } catch (error) {
    throw new Error(`Error checking schedule conflict: ${error.message}`)
  }
}

const updateInfo = async (classEnrollmentId, updateData) => {
  try {
    const updatedMembership = await GET_DB()
      .collection(CLASS_ENROLLMENT_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(classEnrollmentId)) },
        { $set: updateData },
        { returnDocument: 'after' }
      )
    return updatedMembership
  } catch (error) {
    throw new Error(error)
  }
}

const cancelEnrollment = async (classEnrollmentId) => {
  try {
    const cancelledEnrollment = await GET_DB()
      .collection(CLASS_ENROLLMENT_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(classEnrollmentId)) },
        {
          $set: {
            status: CLASS_ENROLLMENT_STATUS.CANCELLED,
            updatedAt: Date.now(),
          },
        },
        { returnDocument: 'after' }
      )
    return cancelledEnrollment
  } catch (error) {
    throw new Error(error)
  }
}

const canCancelEnrollment = async (classEnrollmentId) => {
  try {
    const enrollment = await GET_DB()
      .collection(CLASS_ENROLLMENT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            _id: new ObjectId(String(classEnrollmentId)),
            _destroy: false,
          },
        },
        {
          $lookup: {
            from: 'classes',
            localField: 'classId',
            foreignField: '_id',
            as: 'class',
          },
        },
        {
          $unwind: '$class',
        },
        {
          $project: {
            startDate: '$class.startDate',
            endDate: '$class.endDate',
            status: 1,
          },
        },
      ])
      .toArray()

    if (!enrollment || enrollment.length === 0) {
      return false
    }

    const enrollmentData = enrollment[0]

    // Kiểm tra xem enrollment đã bị hủy chưa
    if (enrollmentData.status === CLASS_ENROLLMENT_STATUS.CANCELLED) {
      return false
    }

    const now = new Date()
    const startDate = new Date(enrollmentData.startDate)

    // Trả về true nếu trước thời gian bắt đầu, false nếu sau thời gian bắt đầu
    return now < startDate
  } catch (error) {
    throw new Error(`Error checking enrollment cancellation: ${error.message}`)
  }
}

const removeUserFromClassSessions = async (userId, classId) => {
  try {
    // Convert IDs to ObjectId
    const userObjectId = new ObjectId(String(userId))
    const classObjectId = new ObjectId(String(classId))

    // Get current time in ISO format
    const currentTime = new Date().toISOString()

    // Remove user from all upcoming class sessions (where startTime >= current time)
    const result = await GET_DB()
      .collection(classSessionModel.CLASS_SESSION_COLLECTION_NAME)
      .updateMany(
        {
          classId: classObjectId,
          startTime: { $gte: currentTime },
          _destroy: false,
        },
        {
          $pull: { users: userObjectId },
          $set: { updatedAt: Date.now() },
        }
      )

    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const classEnrollmentModel = {
  CLASS_ENROLLMENT_COLLECTION_NAME,
  CLASS_ENROLLMENT_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getList,
  getListWithQuantityUser,
  checkScheduleConflict,
  updateInfo,
  cancelEnrollment,
  canCancelEnrollment,
  removeUserFromClassSessions,
}
