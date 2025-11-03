import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { trainerModel } from '~/modules/trainer/model/trainer.model'
import { userModel } from '~/modules/user/model/user.model'
import { roomModel } from '~/modules/room/model/room.model'
import { classModel } from '~/modules/class/model/class.model'
import { locationModel } from '~/modules/location/model/location.model'
import { bookingModel } from '~/modules/booking/model/booking.model'
import { scheduleModel } from '~/modules/schedule/model/schedule.model'

const CLASS_SESSION_COLLECTION_NAME = 'class_sessions'
const CLASS_SESSION_COLLECTION_SCHEMA = Joi.object({
  classId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  trainers: Joi.array().items(Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)).default([]),
  users: Joi.array().items(Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)).default([]),
  roomId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  startTime: Joi.string().isoDate().required(),
  endTime: Joi.string().isoDate().required(),
  title: Joi.string().trim().strict().required(),
  hours: Joi.number().min(1).required(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await CLASS_SESSION_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    // Convert classId to ObjectId
    if (validData.classId) {
      validData.classId = new ObjectId(String(validData.classId))
    }

    // Convert trainer IDs to ObjectId if they're strings
    if (validData.trainers && validData.trainers.length > 0) {
      validData.trainers = validData.trainers.map((id) => new ObjectId(String(id)))
    }

    // Convert user IDs to ObjectId if they're strings
    if (validData.users && validData.users.length > 0) {
      validData.users = validData.users.map((id) => new ObjectId(String(id)))
    }

    // Convert roomId to ObjectId
    if (validData.roomId) {
      validData.roomId = new ObjectId(String(validData.roomId))
    }

    const createdClassSession = await GET_DB().collection(CLASS_SESSION_COLLECTION_NAME).insertOne(validData)
    return createdClassSession
  } catch (error) {
    throw new Error(error)
  }
}

const addUserToClassSessions = async (userId, classId) => {
  try {
    // Convert IDs to ObjectId
    const userObjectId = new ObjectId(String(userId))
    const classObjectId = new ObjectId(String(classId))

    // Get current time in ISO format
    const currentTime = new Date().toISOString()

    // Update only upcoming class sessions (where startTime >= current time)
    const result = await GET_DB()
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .updateMany(
        {
          classId: classObjectId,
          startTime: { $gte: currentTime },
          _destroy: false,
        },
        {
          $addToSet: { users: userObjectId },
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

const getDetailById = async (classSessionId) => {
  try {
    const classSession = await GET_DB()
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(classSessionId)),
      })
    return classSession
  } catch (error) {
    throw new Error(error)
  }
}

const getList = async () => {
  try {
    const listClassSessions = await GET_DB()
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .find({ _destroy: false })
      .toArray()
    return listClassSessions
  } catch (error) {
    throw new Error(error)
  }
}

const getListWithDetails = async () => {
  try {
    const db = await GET_DB()
    const listClassSessions = await db
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .aggregate([
        {
          $match: { _destroy: false },
        },
        {
          $lookup: {
            from: classModel.CLASS_COLLECTION_NAME,
            localField: 'classId',
            foreignField: '_id',
            as: 'classDetails',
          },
        },
        {
          $lookup: {
            from: trainerModel.TRAINER_COLLECTION_NAME,
            localField: 'trainers',
            foreignField: '_id',
            as: 'trainerDetails',
          },
        },
        {
          $lookup: {
            from: userModel.USER_COLLECTION_NAME,
            localField: 'users',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        {
          $lookup: {
            from: roomModel.ROOM_COLLECTION_NAME,
            localField: 'roomId',
            foreignField: '_id',
            as: 'roomDetails',
          },
        },
        {
          $addFields: {
            totalTrainers: { $size: '$trainerDetails' },
            totalUsers: { $size: '$userDetails' },
            classInfo: { $arrayElemAt: ['$classDetails', 0] },
            roomInfo: { $arrayElemAt: ['$roomDetails', 0] },
          },
        },
        {
          $project: {
            title: 1,
            startTime: 1,
            endTime: 1,
            totalTrainers: 1,
            totalUsers: 1,
            'classInfo._id': 1,
            'classInfo.name': 1,
            'classInfo.classType': 1,
            'roomInfo._id': 1,
            'roomInfo.name': 1,
            'roomInfo.capacity': 1,
            'trainerDetails._id': 1,
            'trainerDetails.name': 1,
            'trainerDetails.avatar': 1,
            'userDetails._id': 1,
            'userDetails.name': 1,
            'userDetails.avatar': 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        {
          $sort: { startTime: 1 },
        },
      ])
      .toArray()

    return listClassSessions
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (classSessionId, updateData) => {
  try {
    // Convert classId to ObjectId if present
    if (updateData.classId) {
      updateData.classId = new ObjectId(String(updateData.classId))
    }

    // Convert trainer IDs to ObjectId if present
    if (updateData.trainers && updateData.trainers.length > 0) {
      updateData.trainers = updateData.trainers.map((id) => new ObjectId(String(id)))
    }

    // Convert user IDs to ObjectId if present
    if (updateData.users && updateData.users.length > 0) {
      updateData.users = updateData.users.map((id) => new ObjectId(String(id)))
    }

    // Convert roomId to ObjectId if present
    if (updateData.roomId) {
      updateData.roomId = new ObjectId(String(updateData.roomId))
    }

    const updatedClassSession = await GET_DB()
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(classSessionId)) },
        { $set: updateData },
        { returnDocument: 'after' }
      )
    return updatedClassSession
  } catch (error) {
    throw new Error(error)
  }
}

const deleteClassSession = async (classSessionId) => {
  try {
    const result = await GET_DB()
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(String(classSessionId)) })
    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

const softDelete = async (classSessionId) => {
  try {
    const result = await GET_DB()
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(classSessionId)) },
        { $set: { _destroy: true, updatedAt: Date.now() } },
        { returnDocument: 'after' }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getSessionsByClass = async (classId) => {
  try {
    const sessions = await GET_DB()
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .find({
        classId: new ObjectId(String(classId)),
        _destroy: false,
      })
      .toArray()
    return sessions
  } catch (error) {
    throw new Error(error)
  }
}

const getSessionsByTrainer = async (trainerId) => {
  try {
    const sessions = await GET_DB()
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .find({
        trainers: new ObjectId(String(trainerId)),
        _destroy: false,
      })
      .toArray()
    return sessions
  } catch (error) {
    throw new Error(error)
  }
}

const getSessionsByRoom = async (roomId) => {
  try {
    const sessions = await GET_DB()
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .find({
        roomId: new ObjectId(String(roomId)),
        _destroy: false,
      })
      .toArray()
    return sessions
  } catch (error) {
    throw new Error(error)
  }
}

// startTime: '2025-10-06T12:00:00.000Z',
// endTime: '2025-10-06T13:00:00.000Z',
// trainers:'68d3ad9592b0108bfae55892',
// Updated function signature: now accepts single trainerId
// startTime: '2025-10-06T12:00:00.000Z',
// endTime: '2025-10-06T13:00:00.000Z',
// trainerId: '68d3ad9592b0108bfae55892',
// classId: '68d3ad9592b0108bfae55893' (the class being checked/updated)
const checkPTScheduleConflict = async (trainerId, startTime, endTime, classId) => {
  try {
    const db = await GET_DB()

    // Convert trainer ID to ObjectId
    const trainerObjectId = new ObjectId(String(trainerId))
    const classObjectId = new ObjectId(String(classId))

    // 1. Get the class details to verify trainer belongs to this class
    const classDetails = await db
      .collection(classModel.CLASS_COLLECTION_NAME)
      .findOne({ _id: classObjectId, _destroy: false })

    if (!classDetails) {
      throw new Error('Class not found')
    }

    // 2. Check if the trainer is assigned to this class
    const classTrainerIds = classDetails.trainers.map((id) => id.toString())

    if (!classTrainerIds.includes(trainerObjectId.toString())) {
      // Get trainer details for better error message
      const trainerDetails = await db.collection(trainerModel.TRAINER_COLLECTION_NAME).findOne({ _id: trainerObjectId })

      if (!trainerDetails) {
        return {
          hasConflict: true,
          typeError: 'trainer_not_found',
          message: 'Trainer not found',
        }
      }

      // Get user details
      const user = await db.collection(userModel.USER_COLLECTION_NAME).findOne({ _id: trainerDetails.userId })

      const trainerName = user?.fullName || 'Unknown Trainer'

      return {
        hasConflict: true,
        typeError: 'trainer_not_assigned',
        message: `Trainer "${trainerName}" is not assigned to this class. Please assign them to the class first.`,
        trainerId: trainerId,
        trainerName: trainerName,
      }
    }

    // 3. Parse and validate the time range
    const sessionStart = new Date(startTime)
    const sessionEnd = new Date(endTime)

    if (isNaN(sessionStart.getTime()) || isNaN(sessionEnd.getTime())) {
      throw new Error('Invalid startTime or endTime')
    }

    if (sessionStart >= sessionEnd) {
      throw new Error('startTime must be before endTime')
    }

    const startISO = sessionStart.toISOString()
    const endISO = sessionEnd.toISOString()

    // Store all conflicts found
    const allConflicts = []

    // 4. Check conflicts with OTHER CLASS SESSIONS
    // Note: We exclude sessions from the SAME class to avoid false positives
    const existingClassSessions = await db
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .find({
        trainers: trainerObjectId,
        classId: { $ne: classObjectId }, // Exclude same class
        _destroy: false,
        // Time overlap: existing.start < newEnd && existing.end > newStart
        startTime: { $lt: endISO },
        endTime: { $gt: startISO },
      })
      .toArray()

    for (const session of existingClassSessions) {
      // Lookup class and room details
      const sessionClass = await db.collection(classModel.CLASS_COLLECTION_NAME).findOne({ _id: session.classId })

      const roomDetails = await db.collection(roomModel.ROOM_COLLECTION_NAME).findOne({ _id: session.roomId })

      allConflicts.push({
        type: 'CLASS_SESSION',
        conflictingSession: {
          sessionId: session._id,
          classId: session.classId,
          className: sessionClass?.name || 'Unknown Class',
          title: session.title,
          roomName: roomDetails?.name || 'Unknown Room',
          startTime: session.startTime,
          endTime: session.endTime,
        },
      })
    }

    // 5. Check conflicts with BOOKINGS (through schedules)
    const trainerSchedules = await db
      .collection(scheduleModel.SCHEDULE_COLLECTION_NAME)
      .find({
        trainerId: trainerObjectId,
        _destroy: false,
        // Time overlap: existing.start < newEnd && existing.end > newStart
        startTime: { $lt: endISO },
        endTime: { $gt: startISO },
      })
      .toArray()

    for (const schedule of trainerSchedules) {
      // Check if this schedule has an active booking
      const booking = await db.collection(bookingModel.BOOKING_COLLECTION_NAME).findOne({
        scheduleId: schedule._id,
        _destroy: false,
      })

      // Get user and location details if booking exists
      let userDetails = null
      let locationDetails = null

      if (booking) {
        userDetails = await db.collection(userModel.USER_COLLECTION_NAME).findOne({ _id: booking.userId })

        locationDetails = await db
          .collection(locationModel.LOCATION_COLLECTION_NAME)
          .findOne({ _id: booking.locationId })
      }

      allConflicts.push({
        type: 'BOOKING',
        conflictingBooking: {
          scheduleId: schedule._id,
          bookingId: booking?._id || null,
          isBooked: !!booking,
          clientName: userDetails?.fullName || 'Available slot',
          locationName: locationDetails?.name || '',
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          bookingStatus: booking?.status || 'AVAILABLE',
        },
      })
    }

    // 6. Get trainer details for the response
    if (allConflicts.length > 0) {
      const trainerDetails = await db.collection(trainerModel.TRAINER_COLLECTION_NAME).findOne({ _id: trainerObjectId })

      // Get user details for trainer
      const user = await db.collection(userModel.USER_COLLECTION_NAME).findOne({ _id: trainerDetails?.userId })

      return {
        hasConflict: true,
        totalConflictCount: allConflicts.length,
        typeError: 'schedule_conflict',
        trainerInfo: {
          trainerId: trainerId,
          name: user?.fullName || 'Unknown Trainer',
          specialization: trainerDetails?.specialization || '',
        },
        conflicts: allConflicts,
        message: `Found ${allConflicts.length} scheduling conflict(s) for this trainer`,
      }
    }

    // No conflicts found
    return {
      hasConflict: false,
      trainerId: trainerId,
      message: 'No scheduling conflicts found for this trainer',
    }
  } catch (error) {
    throw new Error(`Error checking PT schedule conflict: ${error.message}`)
  }
}

// startTime: '2025-10-06T12:00:00.000Z',
// endTime: '2025-10-06T13:00:00.000Z',
// roomId: '68dbdd2f1f6ee91416652ebe',
// startTime: '2025-10-06T12:00:00.000Z',
// endTime: '2025-10-06T13:00:00.000Z',
// roomId: '68dbdd2f1f6ee91416652ebe',
// sessionId: '68dbdd2f1f6ee91416652ebf' (optional - the session being updated)
const checkRoomScheduleConflict = async (sessionId, startTime, endTime, roomId) => {
  try {
    const db = await GET_DB()

    // Convert roomId to ObjectId
    const roomObjectId = new ObjectId(String(roomId))

    // Parse the time range
    const sessionStart = new Date(startTime)
    const sessionEnd = new Date(endTime)

    // Validate dates
    if (isNaN(sessionStart.getTime()) || isNaN(sessionEnd.getTime())) {
      throw new Error('Invalid startTime or endTime')
    }

    if (sessionStart >= sessionEnd) {
      throw new Error('startTime must be before endTime')
    }

    const startISO = sessionStart.toISOString()
    const endISO = sessionEnd.toISOString()

    // Get room details first
    const roomDetails = await db
      .collection(roomModel.ROOM_COLLECTION_NAME)
      .findOne({ _id: roomObjectId, _destroy: false })

    if (!roomDetails) {
      return {
        hasConflict: false,
        typeError: 'room_not_found',
        message: 'Room not found or has been deleted',
      }
    }

    // Build query to find conflicting sessions
    const query = {
      roomId: roomObjectId,
      _destroy: false,
      startTime: { $lt: endISO },
      endTime: { $gt: startISO },
    }

    // CRITICAL FIX: Exclude the session itself if sessionId is provided
    if (sessionId) {
      query._id = { $ne: new ObjectId(String(sessionId)) }
    }

    // Find all class sessions in this room that overlap with the proposed time
    const conflictingSessions = await db.collection(CLASS_SESSION_COLLECTION_NAME).find(query).toArray()

    // If no conflicts found, return success
    if (conflictingSessions.length === 0) {
      return {
        hasConflict: false,
        roomId: roomId,
        roomName: roomDetails.name,
        message: 'No scheduling conflicts found for this room',
      }
    }

    // Process conflicts with detailed information
    const conflicts = []

    for (const session of conflictingSessions) {
      // Get class details
      const classDetails = await db.collection(classModel.CLASS_COLLECTION_NAME).findOne({ _id: session.classId })

      // Get trainer details
      const trainerDetails = await db
        .collection(trainerModel.TRAINER_COLLECTION_NAME)
        .find({ _id: { $in: session.trainers } })
        .toArray()

      // Get user details for trainers
      const userIds = trainerDetails.map((t) => t.userId)
      const users = await db
        .collection(userModel.USER_COLLECTION_NAME)
        .find({ _id: { $in: userIds } })
        .toArray()

      const trainerNames = trainerDetails.map((trainer) => {
        const user = users.find((u) => u._id.equals(trainer.userId))
        return user?.fullName || 'Unknown Trainer'
      })

      conflicts.push({
        sessionId: session._id,
        sessionTitle: session.title,
        classId: session.classId,
        className: classDetails?.name || 'Unknown Class',
        classType: classDetails?.classType || '',
        startTime: session.startTime,
        endTime: session.endTime,
        trainers: trainerNames,
        totalUsers: session.users?.length || 0,
      })
    }

    return {
      hasConflict: true,
      typeError: 'room_conflict',
      roomId: roomId,
      roomName: roomDetails.name,
      roomCapacity: roomDetails.capacity,
      conflictCount: conflicts.length,
      conflicts: conflicts,
      message: `Found ${conflicts.length} scheduling conflict(s) in room "${roomDetails.name}"`,
    }
  } catch (error) {
    throw new Error(`Error checking room schedule conflict: ${error.message}`)
  }
}
// Lấy các class sessions sắp tới trong khoảng thời gian nhất định để gửi reminder
const getUpcomingClassSessionsForReminder = async (minutesBefore) => {
  try {
    const now = new Date()
    const reminderTime = new Date(now.getTime() + minutesBefore * 60 * 1000)

    const upcomingClassSessions = await GET_DB()
      .collection(CLASS_SESSION_COLLECTION_NAME)
      .aggregate([
        // Match class sessions trong khoảng thời gian reminder
        {
          $match: {
            _destroy: false,
            users: { $exists: true, $not: { $size: 0 } }, // Chỉ sessions có users
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$startTime' } }, now] },
                { $lte: [{ $dateFromString: { dateString: '$startTime' } }, reminderTime] },
              ],
            },
          },
        },
        // Join với classes để lấy class info
        {
          $lookup: {
            from: classModel.CLASS_COLLECTION_NAME,
            localField: 'classId',
            foreignField: '_id',
            as: 'class',
          },
        },
        {
          $unwind: '$class',
        },
        // Join với rooms để lấy room info
        {
          $lookup: {
            from: roomModel.ROOM_COLLECTION_NAME,
            localField: 'roomId',
            foreignField: '_id',
            as: 'room',
          },
        },
        {
          $unwind: '$room',
        },
        // Join với locations để lấy location info
        {
          $lookup: {
            from: locationModel.LOCATION_COLLECTION_NAME,
            localField: 'room.locationId',
            foreignField: '_id',
            as: 'location',
          },
        },
        {
          $unwind: '$location',
        },
        // Join với trainers để lấy trainer info
        {
          $lookup: {
            from: trainerModel.TRAINER_COLLECTION_NAME,
            localField: 'trainers',
            foreignField: '_id',
            as: 'trainerDetails',
          },
        },
        // Join với users để lấy trainer user info
        {
          $lookup: {
            from: userModel.USER_COLLECTION_NAME,
            localField: 'trainerDetails.userId',
            foreignField: '_id',
            as: 'trainerUsers',
          },
        },
        // Join với users để lấy enrolled users info
        {
          $lookup: {
            from: userModel.USER_COLLECTION_NAME,
            localField: 'users',
            foreignField: '_id',
            as: 'enrolledUsers',
          },
        },
        // Project final structure
        {
          $project: {
            _id: 1,
            title: 1,
            startTime: 1,
            endTime: 1,
            hours: 1,
            users: 1,
            trainers: 1,
            class: {
              _id: '$class._id',
              name: '$class.name',
              description: '$class.description',
              classType: '$class.classType',
            },
            room: {
              _id: '$room._id',
              name: '$room.name',
              capacity: '$room.capacity',
            },
            location: {
              _id: '$location._id',
              name: '$location.name',
              address: '$location.address',
            },
            trainerUsers: {
              $map: {
                input: '$trainerUsers',
                as: 'trainer',
                in: {
                  _id: '$$trainer._id',
                  fullName: '$$trainer.fullName',
                  phone: '$$trainer.phone',
                  avatar: '$$trainer.avatar',
                },
              },
            },
            enrolledUsers: {
              $map: {
                input: '$enrolledUsers',
                as: 'user',
                in: {
                  _id: '$$user._id',
                  fullName: '$$user.fullName',
                  phone: '$$user.phone',
                  avatar: '$$user.avatar',
                },
              },
            },
          },
        },
        // Sort by startTime
        {
          $sort: {
            startTime: 1,
          },
        },
      ])
      .toArray()

    return upcomingClassSessions
  } catch (error) {
    throw new Error(error)
  }
}

// Thêm method để check user có active enrollment không
const checkUserActiveEnrollment = async (userId, classId) => {
  try {
    const activeEnrollment = await GET_DB()
      .collection('class_enrollments')
      .findOne({
        userId: new ObjectId(String(userId)),
        classId: new ObjectId(String(classId)),
        status: 'active',
        paymentStatus: 'paid',
        _destroy: false,
      })

    return activeEnrollment !== null
  } catch (error) {
    throw new Error(error)
  }
}

// Export thêm các methods mới
export const classSessionModel = {
  CLASS_SESSION_COLLECTION_NAME,
  CLASS_SESSION_COLLECTION_SCHEMA,
  createNew,
  addUserToClassSessions,
  getDetailById,
  getList,
  getListWithDetails,
  updateInfo,
  deleteClassSession,
  softDelete,
  getSessionsByClass,
  getSessionsByTrainer,
  getSessionsByRoom,
  checkPTScheduleConflict,
  checkRoomScheduleConflict,
  getUpcomingClassSessionsForReminder, // Method mới
  checkUserActiveEnrollment, // Method mới
}
