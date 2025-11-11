import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'
import { CLASS_TYPE } from '~/utils/constants'
import { trainerModel } from '~/modules/trainer/model/trainer.model'
import { roomModel } from '~/modules/room/model/room.model'
import { userModel } from '~/modules/user/model/user.model'
import { reviewModel } from '~/modules/review/model/review.model'
import { classSessionModel } from '~/modules/classSession/model/classSession.model'
import { classEnrollmentModel } from '~/modules/classEnrollment/model/classEnrollment.model'
import { locationModel } from '~/modules/location/model/location.model'
import { bookingModel } from '~/modules/booking/model/booking.model'
import { scheduleModel } from '~/modules/schedule/model/schedule.model'

const CLASS_COLLECTION_NAME = 'classes'
const CLASS_COLLECTION_SCHEMA = Joi.object({
  locationId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).required(),
  name: Joi.string().trim().strict().required(),
  description: Joi.string().trim().strict().required(),
  classType: Joi.string().valid(CLASS_TYPE.BOXING, CLASS_TYPE.DANCE, CLASS_TYPE.YOGA).required(),
  image: Joi.string().trim().strict().default(''),
  trainers: Joi.array().items(Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)).default([]),
  capacity: Joi.number().min(1).required(),
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
  price: Joi.number().min(1).required(),

  recurrence: Joi.array()
    .items(
      Joi.object({
        dayOfWeek: Joi.number().integer().min(1).max(7).required(),
        startTime: Joi.object({
          hour: Joi.number().min(0).max(24),
          minute: Joi.number().min(0).max(60),
        }),
        endTime: Joi.object({
          hour: Joi.number().min(0).max(24),
          minute: Joi.number().min(0).max(60),
        }),
        roomId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
      })
    )
    .default([]),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await CLASS_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    if (validData.locationId) {
      validData.locationId = new ObjectId(String(validData.locationId))
    }

    // Convert trainer IDs to ObjectId if they're strings
    if (validData.trainers && validData.trainers.length > 0) {
      validData.trainers = validData.trainers.map((id) => new ObjectId(String(id)))
    }

    // Convert room IDs in recurrence to ObjectId
    if (validData.recurrence && validData.recurrence.length > 0) {
      validData.recurrence = validData.recurrence.map((rec) => ({
        ...rec,
        roomId: rec.roomId ? new ObjectId(String(rec.roomId)) : null,
      }))
    }

    const createdClass = await GET_DB().collection(CLASS_COLLECTION_NAME).insertOne(validData)
    return createdClass
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (classId) => {
  try {
    const classDoc = await GET_DB()
      .collection(CLASS_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(classId)),
      })
    return classDoc
  } catch (error) {
    throw new Error(error)
  }
}

const getList = async () => {
  try {
    const listClasses = await GET_DB().collection(CLASS_COLLECTION_NAME).find({ _destroy: false }).toArray()
    return listClasses
  } catch (error) {
    throw new Error(error)
  }
}

const getListClassInfoForAdmin = async () => {
  try {
    const db = await GET_DB()
    const listClasses = await db
      .collection(CLASS_COLLECTION_NAME)
      .aggregate([
        {
          $match: { _destroy: false },
        },
        // Lookup Location
        {
          $lookup: {
            from: locationModel.LOCATION_COLLECTION_NAME,
            localField: 'locationId',
            foreignField: '_id',
            as: 'locationDetails',
          },
        },
        // Lookup ClassEnrollments
        {
          $lookup: {
            from: 'class_enrollments',
            localField: '_id',
            foreignField: 'classId',
            as: 'enrollments',
          },
        },
        // Lookup ClassSessions
        {
          $lookup: {
            from: 'class_sessions',
            localField: '_id',
            foreignField: 'classId',
            as: 'sessions',
          },
        },
        // Add fields for counts and revenue
        {
          $addFields: {
            enrolledCount: { $size: '$enrollments' },
            sessionsCount: { $size: '$sessions' },
            revenue: {
              $sum: '$enrollments.price',
            },
            locationInfo: { $arrayElemAt: ['$locationDetails', 0] },
          },
        },
        // Unwind enrollments to lookup user details
        {
          $lookup: {
            from: 'users',
            localField: 'enrollments.userId',
            foreignField: '_id',
            as: 'enrollmentUsers',
          },
        },
        // Process enrollments with user details
        {
          $addFields: {
            classEnrollments: {
              $map: {
                input: '$enrollments',
                as: 'enrollment',
                in: {
                  $let: {
                    vars: {
                      user: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$enrollmentUsers',
                              as: 'u',
                              cond: { $eq: ['$$u._id', '$$enrollment.userId'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: '$$enrollment._id',
                      fullName: { $ifNull: ['$$user.fullName', ''] },
                      phone: { $ifNull: ['$$user.phone', ''] },
                      avatar: { $ifNull: ['$$user.avatar', ''] },
                      createAt: { $ifNull: ['$$enrollment.enrolledAt', ''] },
                    },
                  },
                },
              },
            },
          },
        },
        // Process sessions
        {
          $addFields: {
            classSessions: {
              $map: {
                input: '$sessions',
                as: 'session',
                in: {
                  _id: '$$session._id',
                  classId: '$$session.classId',
                  className: '$name',
                  hours: '$$session.hours',
                  startTime: { $ifNull: ['$$session.startTime', ''] },
                  endTime: { $ifNull: ['$$session.endTime', ''] },
                  roomId: { $ifNull: ['$$session.roomId', ''] },
                  trainers: { $ifNull: ['$$session.trainers', []] },
                  users: { $ifNull: ['$$session.users', []] },
                  title: { $ifNull: ['$$session.title', 'Lớp học'] },
                },
              },
            },
          },
        },
        // Project final structure
        {
          $project: {
            _id: 1,
            name: 1,
            price: 1,
            description: 1,
            classType: 1,
            image: { $ifNull: ['$image', ''] },
            trainers: 1,
            capacity: 1,
            startDate: 1,
            endDate: 1,
            recurrence: 1,
            enrolledCount: 1,
            sessionsCount: 1,
            revenue: 1,
            classSessions: 1,
            classEnrollments: 1,
            locationName: { $ifNull: ['$locationInfo.name', ''] },
            locationAddress: {
              street: { $ifNull: ['$locationInfo.address.street', ''] },
              ward: { $ifNull: ['$locationInfo.address.ward', ''] },
              province: { $ifNull: ['$locationInfo.address.province', ''] },
            },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray()

    return listClasses
  } catch (error) {
    throw new Error(error)
  }
}

const getListClassInfoForUser = async () => {
  try {
    const db = await GET_DB()
    const listClasses = await db
      .collection(CLASS_COLLECTION_NAME)
      .aggregate([
        {
          $match: { _destroy: false },
        },
        // Lookup location details
        {
          $lookup: {
            from: locationModel.LOCATION_COLLECTION_NAME,
            localField: 'locationId',
            foreignField: '_id',
            as: 'locationDetails',
          },
        },
        // Lookup trainer details
        {
          $lookup: {
            from: trainerModel.TRAINER_COLLECTION_NAME,
            localField: 'trainers',
            foreignField: '_id',
            as: 'trainerDetails',
          },
        },
        // Lookup class enrollments to count enrolled users
        {
          $lookup: {
            from: classEnrollmentModel.CLASS_ENROLLMENT_COLLECTION_NAME,
            localField: '_id',
            foreignField: 'classId',
            as: 'enrollments',
          },
        },
        // Lookup class sessions
        {
          $lookup: {
            from: classSessionModel.CLASS_SESSION_COLLECTION_NAME,
            localField: '_id',
            foreignField: 'classId',
            as: 'sessions',
          },
        },
        // Lookup rooms for class sessions
        {
          $lookup: {
            from: roomModel.ROOM_COLLECTION_NAME,
            localField: 'sessions.roomId',
            foreignField: '_id',
            as: 'roomDetails',
          },
        },
        // Lookup reviews for trainers to get ratings
        {
          $lookup: {
            from: reviewModel.REVIEW_COLLECTION_NAME,
            localField: 'trainers',
            foreignField: 'trainerId',
            as: 'trainerReviews',
          },
        },
        // Process the data
        {
          $addFields: {
            locationInfo: { $arrayElemAt: ['$locationDetails', 0] },
            enrolled: {
              $size: {
                $filter: {
                  input: '$enrollments',
                  cond: { $eq: ['$$this._destroy', false] },
                },
              },
            },
            // Process trainers with their ratings
            trainersWithRatings: {
              $map: {
                input: '$trainerDetails',
                as: 'trainer',
                in: {
                  $let: {
                    vars: {
                      trainerReviews: {
                        $filter: {
                          input: '$trainerReviews',
                          cond: {
                            $and: [{ $eq: ['$$this.trainerId', '$$trainer._id'] }, { $eq: ['$$this._destroy', false] }],
                          },
                        },
                      },
                      // Join with users collection through a subquery
                      userInfo: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: { $literal: [] }, // Will be populated in next lookup
                              cond: { $eq: ['$$this._id', '$$trainer.userId'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: '$$trainer._id',
                      userId: '$$trainer.userId',
                      name: '',
                      avatar: '',
                      phone: '',
                      specialization: '$$trainer.specialization',
                      rating: {
                        $cond: {
                          if: { $gt: [{ $size: '$$trainerReviews' }, 0] },
                          then: {
                            $round: [
                              {
                                $avg: {
                                  $map: {
                                    input: '$$trainerReviews',
                                    as: 'review',
                                    in: '$$review.rating',
                                  },
                                },
                              },
                              0,
                            ],
                          },
                          else: 0,
                        },
                      },
                    },
                  },
                },
              },
            },
            // Process class sessions with room info
            processedSessions: {
              $map: {
                input: {
                  $filter: {
                    input: '$sessions',
                    cond: { $eq: ['$$this._destroy', false] },
                  },
                },
                as: 'session',
                in: {
                  $let: {
                    vars: {
                      roomInfo: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$roomDetails',
                              cond: { $eq: ['$$this._id', '$$session.roomId'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: '$$session._id',
                      title: '$$session.title',
                      startTime: '$$session.startTime',
                      endTime: '$$session.endTime',
                      room: { $ifNull: ['$$roomInfo.name', ''] },
                    },
                  },
                },
              },
            },
          },
        },
        // Lookup user details for trainers
        {
          $lookup: {
            from: userModel.USER_COLLECTION_NAME,
            localField: 'trainersWithRatings.userId',
            foreignField: '_id',
            as: 'trainerUsers',
          },
        },
        // Final processing to combine trainer info with user details
        {
          $addFields: {
            trainers: {
              $map: {
                input: '$trainersWithRatings',
                as: 'trainer',
                in: {
                  $let: {
                    vars: {
                      userDetail: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$trainerUsers',
                              cond: { $eq: ['$$this._id', '$$trainer.userId'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: '$$trainer._id',
                      name: { $ifNull: ['$$userDetail.fullName', ''] },
                      avatar: { $ifNull: ['$$userDetail.avatar', ''] },
                      phone: { $ifNull: ['$$userDetail.phone', ''] },
                      specialization: '$$trainer.specialization',
                      rating: '$$trainer.rating',
                    },
                  },
                },
              },
            },
          },
        },
        // Project final structure
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            classType: 1,
            image: { $ifNull: ['$image', ''] },
            capacity: 1,
            enrolled: 1,
            startDate: 1,
            endDate: 1,
            price: 1,
            locationName: { $ifNull: ['$locationInfo.name', ''] },
            address: {
              street: { $ifNull: ['$locationInfo.address.street', ''] },
              ward: { $ifNull: ['$locationInfo.address.ward', ''] },
              province: { $ifNull: ['$locationInfo.address.province', ''] },
            },
            trainers: 1,
            recurrence: 1,
            classSession: '$processedSessions',
          },
        },
        // Sort by start date (most recent first)
        {
          $sort: { startDate: -1 },
        },
      ])
      .toArray()

    return listClasses
  } catch (error) {
    throw new Error(error)
  }
}

const getListClassInfoForTrainer = async (trainerId) => {
  try {
    const db = await GET_DB()
    const trainerObjectId = new ObjectId(String(trainerId))

    const listClasses = await db
      .collection(CLASS_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            _destroy: false,
            trainers: trainerObjectId,
          },
        },
        // Lookup location details
        {
          $lookup: {
            from: locationModel.LOCATION_COLLECTION_NAME,
            localField: 'locationId',
            foreignField: '_id',
            as: 'locationDetails',
          },
        },
        // Lookup trainer details
        {
          $lookup: {
            from: trainerModel.TRAINER_COLLECTION_NAME,
            localField: 'trainers',
            foreignField: '_id',
            as: 'trainerDetails',
          },
        },
        // Lookup class enrollments
        {
          $lookup: {
            from: classEnrollmentModel.CLASS_ENROLLMENT_COLLECTION_NAME,
            localField: '_id',
            foreignField: 'classId',
            as: 'enrollments',
          },
        },
        // Lookup class sessions
        {
          $lookup: {
            from: classSessionModel.CLASS_SESSION_COLLECTION_NAME,
            localField: '_id',
            foreignField: 'classId',
            as: 'sessions',
          },
        },
        // Lookup rooms for class sessions
        {
          $lookup: {
            from: roomModel.ROOM_COLLECTION_NAME,
            localField: 'sessions.roomId',
            foreignField: '_id',
            as: 'roomDetails',
          },
        },
        // Lookup reviews for trainers to get ratings
        {
          $lookup: {
            from: reviewModel.REVIEW_COLLECTION_NAME,
            localField: 'trainers',
            foreignField: 'trainerId',
            as: 'trainerReviews',
          },
        },
        // Lookup user details for trainers
        {
          $lookup: {
            from: userModel.USER_COLLECTION_NAME,
            localField: 'trainerDetails.userId',
            foreignField: '_id',
            as: 'trainerUsers',
          },
        },
        // Lookup user details for enrolled students
        {
          $lookup: {
            from: userModel.USER_COLLECTION_NAME,
            localField: 'enrollments.userId',
            foreignField: '_id',
            as: 'enrolledUsers',
          },
        },
        // Process the data
        {
          $addFields: {
            locationInfo: { $arrayElemAt: ['$locationDetails', 0] },
            // Process trainers with their ratings
            trainers: {
              $map: {
                input: '$trainerDetails',
                as: 'trainer',
                in: {
                  $let: {
                    vars: {
                      userDetail: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$trainerUsers',
                              cond: { $eq: ['$$this._id', '$$trainer.userId'] },
                            },
                          },
                          0,
                        ],
                      },
                      trainerReviews: {
                        $filter: {
                          input: '$trainerReviews',
                          cond: {
                            $and: [{ $eq: ['$$this.trainerId', '$$trainer._id'] }, { $eq: ['$$this._destroy', false] }],
                          },
                        },
                      },
                    },
                    in: {
                      _id: '$$trainer._id',
                      fullName: { $ifNull: ['$$userDetail.fullName', ''] },
                      avatar: { $ifNull: ['$$userDetail.avatar', ''] },
                      phone: { $ifNull: ['$$userDetail.phone', ''] },
                      specialization: '$$trainer.specialization',
                      rating: {
                        $cond: {
                          if: { $gt: [{ $size: '$$trainerReviews' }, 0] },
                          then: {
                            $round: [
                              {
                                $avg: {
                                  $map: {
                                    input: '$$trainerReviews',
                                    as: 'review',
                                    in: '$$review.rating',
                                  },
                                },
                              },
                              0,
                            ],
                          },
                          else: 0,
                        },
                      },
                    },
                  },
                },
              },
            },
            // Process class sessions with room info
            classSession: {
              $map: {
                input: {
                  $filter: {
                    input: '$sessions',
                    cond: { $eq: ['$$this._destroy', false] },
                  },
                },
                as: 'session',
                in: {
                  $let: {
                    vars: {
                      roomInfo: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$roomDetails',
                              cond: { $eq: ['$$this._id', '$$session.roomId'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: '$$session._id',
                      className: '$name',
                      hours: '$$session.hours',
                      startTime: '$$session.startTime',
                      endTime: '$$session.endTime',
                      roomName: { $ifNull: ['$$roomInfo.name', ''] },
                      title: '$$session.title',
                    },
                  },
                },
              },
            },
            // Process enrolled students
            classEnrolled: {
              $map: {
                input: {
                  $filter: {
                    input: '$enrollments',
                    cond: { $eq: ['$$this._destroy', false] },
                  },
                },
                as: 'enrollment',
                in: {
                  $let: {
                    vars: {
                      user: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$enrolledUsers',
                              cond: { $eq: ['$$this._id', '$$enrollment.userId'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      userId: { $toString: '$$enrollment.userId' },
                      fullName: { $ifNull: ['$$user.fullName', ''] },
                      phone: { $ifNull: ['$$user.phone', ''] },
                      avatar: { $ifNull: ['$$user.avatar', ''] },
                    },
                  },
                },
              },
            },
          },
        },
        // Project final structure
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            capacity: 1,
            trainers: 1,
            classType: 1,
            price: 1,
            locationInfo: {
              _id: '$locationInfo._id',
              name: { $ifNull: ['$locationInfo.name', ''] },
              address: {
                street: { $ifNull: ['$locationInfo.address.street', ''] },
                ward: { $ifNull: ['$locationInfo.address.ward', ''] },
                province: { $ifNull: ['$locationInfo.address.province', ''] },
              },
            },
            startDate: 1,
            endDate: 1,
            recurrence: 1,
            image: { $ifNull: ['$image', ''] },
            classSession: 1,
            classEnrolled: 1,
          },
        },
        // Sort by start date (most recent first)
        {
          $sort: { startDate: -1 },
        },
      ])
      .toArray()

    return listClasses
  } catch (error) {
    throw new Error(`Error getting trainer's classes: ${error.message}`)
  }
}

const getListWithDetails = async () => {
  try {
    const db = await GET_DB()
    const listClasses = await db
      .collection(CLASS_COLLECTION_NAME)
      .aggregate([
        {
          $match: { _destroy: false },
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
          $addFields: {
            totalTrainers: { $size: '$trainerDetails' },
            totalSessions: { $size: '$recurrence' },
          },
        },
        {
          $project: {
            name: 1,
            description: 1,
            classType: 1,
            image: 1,
            capacity: 1,
            startDate: 1,
            endDate: 1,
            totalTrainers: 1,
            totalSessions: 1,
            'trainerDetails._id': 1,
            'trainerDetails.name': 1,
            'trainerDetails.avatar': 1,
            recurrence: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray()

    return listClasses
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (classId, updateData) => {
  try {
    // Convert trainer IDs to ObjectId if present
    if (updateData.trainers && updateData.trainers.length > 0) {
      updateData.trainers = updateData.trainers.map((id) => new ObjectId(String(id)))
    }

    const updatedClass = await GET_DB()
      .collection(CLASS_COLLECTION_NAME)
      .findOneAndUpdate({ _id: new ObjectId(String(classId)) }, { $set: updateData }, { returnDocument: 'after' })
    return updatedClass
  } catch (error) {
    throw new Error(error)
  }
}

const deleteClass = async (classId) => {
  try {
    const classObjectId = new ObjectId(String(classId))

    // First, delete all class sessions associated with this class
    await GET_DB().collection(classSessionModel.CLASS_SESSION_COLLECTION_NAME).deleteMany({ classId: classObjectId })

    // Then, delete the class itself
    const result = await GET_DB().collection(CLASS_COLLECTION_NAME).deleteOne({ _id: classObjectId })

    return result.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

const softDelete = async (classId) => {
  try {
    const classObjectId = new ObjectId(String(classId))

    // Soft delete all class sessions associated with this class
    await GET_DB()
      .collection(classSessionModel.CLASS_SESSION_COLLECTION_NAME)
      .updateMany(
        { classId: classObjectId },
        {
          $set: {
            _destroy: true,
            updatedAt: Date.now(),
          },
        }
      )

    // Soft delete the class itself
    const result = await GET_DB()
      .collection(CLASS_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: classObjectId },
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

const getClassesByType = async (classType) => {
  try {
    const classes = await GET_DB()
      .collection(CLASS_COLLECTION_NAME)
      .find({
        classType: classType,
        _destroy: false,
      })
      .toArray()
    return classes
  } catch (error) {
    throw new Error(error)
  }
}

//   startDate: '2025-10-09T00:00:00.000Z',
//   endDate: '2025-11-09T23:59:59.999Z',
//   recurrence: [
//     {
//       dayOfWeek: 1,
//       startTime: { hour: 10, minute: 0},
//       endTime: {hour: 11, minute : 30},
//       roomId: '68dbdd2f1f6ee91416652ebe'
//     }
//   ],

const checkRoomScheduleConflict = async (startDate, endDate, recurrence) => {
  try {
    const db = await GET_DB()

    // Parse the date range
    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)

    // Store all conflicts found
    const allConflicts = []

    // Check each recurrence pattern
    for (const pattern of recurrence) {
      const { dayOfWeek, startTime, endTime, roomId } = pattern

      // Convert roomId to ObjectId
      const roomObjectId = new ObjectId(String(roomId))

      // Find all class sessions in this room within the date range
      const existingSessions = await db
        .collection(classSessionModel.CLASS_SESSION_COLLECTION_NAME)
        .find({
          roomId: roomObjectId,
          _destroy: false,
          // Sessions that fall within or overlap with our date range
          startTime: { $lte: endDate },
          endTime: { $gte: startDate },
        })
        .toArray()

      // Check each existing session for conflicts
      for (const session of existingSessions) {
        const sessionStart = new Date(session.startTime)
        const sessionEnd = new Date(session.endTime)

        // Get day of week (1 = Monday, 7 = Sunday)
        const sessionDayOfWeek = sessionStart.getDay() === 0 ? 7 : sessionStart.getDay()

        // Check if it's on the same day of week
        if (sessionDayOfWeek === dayOfWeek) {
          // Extract time components from existing session
          const sessionStartHour = sessionStart.getHours()
          const sessionStartMinute = sessionStart.getMinutes()
          const sessionEndHour = sessionEnd.getHours()
          const sessionEndMinute = sessionEnd.getMinutes()

          // Convert times to minutes since midnight for easier comparison
          const proposedStart = startTime.hour * 60 + startTime.minute
          const proposedEnd = endTime.hour * 60 + endTime.minute
          const existingStart = sessionStartHour * 60 + sessionStartMinute
          const existingEnd = sessionEndHour * 60 + sessionEndMinute

          // Check if time slots overlap
          // Two time slots overlap if: start1 < end2 AND start2 < end1
          const hasTimeOverlap = proposedStart < existingEnd && existingStart < proposedEnd

          if (hasTimeOverlap) {
            // Lookup room and class details for better conflict reporting
            const roomDetails = await db.collection(roomModel.ROOM_COLLECTION_NAME).findOne({ _id: roomObjectId })

            const classDetails = await db.collection(CLASS_COLLECTION_NAME).findOne({ _id: session.classId })

            allConflicts.push({
              roomId: roomId,
              roomName: roomDetails?.name || 'Unknown Room',
              dayOfWeek: dayOfWeek,
              proposedTimeSlot: {
                start: `${String(startTime.hour).padStart(2, '0')}:${String(startTime.minute).padStart(2, '0')}`,
                end: `${String(endTime.hour).padStart(2, '0')}:${String(endTime.minute).padStart(2, '0')}`,
              },
              conflictingSession: {
                sessionId: session._id,
                classId: session.classId,
                className: classDetails?.name || 'Unknown Class',
                startTime: session.startTime,
                endTime: session.endTime,
                timeSlot: {
                  start: `${String(sessionStartHour).padStart(2, '0')}:${String(sessionStartMinute).padStart(2, '0')}`,
                  end: `${String(sessionEndHour).padStart(2, '0')}:${String(sessionEndMinute).padStart(2, '0')}`,
                },
              },
            })
          }
        }
      }
    }

    return {
      hasConflict: allConflicts.length > 0,
      conflictCount: allConflicts.length,
      conflicts: allConflicts,
    }
  } catch (error) {
    throw new Error(`Error checking room schedule conflict: ${error.message}`)
  }
}

// trainers: [ '68d3ad9592b0108bfae55892' ],
// startDate: '2025-10-09T00:00:00.000Z',
//   endDate: '2025-11-09T23:59:59.999Z',
//   recurrence: [
//     {
//       dayOfWeek: 1,
//       startTime: { hour: 10, minute: 0},
//       endTime: {hour: 11, minute : 30},
//       roomId: '68dbdd2f1f6ee91416652ebe'
//     }
//   ],
const checkPTScheduleConflict = async (trainers, startDate, endDate, recurrence) => {
  try {
    const db = await GET_DB()

    // Parse the date range
    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)

    // Convert trainer IDs to ObjectId array
    const trainerObjectIds = trainers.map((id) => new ObjectId(String(id)))

    // Store all conflicts found, organized by trainer
    const conflictsByTrainer = {}
    const allConflicts = []

    // Check each recurrence pattern
    for (const pattern of recurrence) {
      const { dayOfWeek, startTime, endTime } = pattern

      // 1. Check conflicts with existing CLASS SESSIONS for ALL trainers
      const existingClassSessions = await db
        .collection(classSessionModel.CLASS_SESSION_COLLECTION_NAME)
        .find({
          trainers: { $in: trainerObjectIds },
          _destroy: false,
          // Sessions that fall within or overlap with our date range
          startTime: { $lte: endDate },
          endTime: { $gte: startDate },
        })
        .toArray()

      // Check each existing class session for conflicts
      for (const session of existingClassSessions) {
        const sessionStart = new Date(session.startTime)
        const sessionEnd = new Date(session.endTime)

        // Get day of week (1 = Monday, 7 = Sunday)
        const sessionDayOfWeek = sessionStart.getDay() === 0 ? 7 : sessionStart.getDay()

        // Check if it's on the same day of week
        if (sessionDayOfWeek === dayOfWeek) {
          // Extract time components from existing session
          const sessionStartHour = sessionStart.getHours()
          const sessionStartMinute = sessionStart.getMinutes()
          const sessionEndHour = sessionEnd.getHours()
          const sessionEndMinute = sessionEnd.getMinutes()

          // Convert times to minutes since midnight for easier comparison
          const proposedStart = startTime.hour * 60 + startTime.minute
          const proposedEnd = endTime.hour * 60 + endTime.minute
          const existingStart = sessionStartHour * 60 + sessionStartMinute
          const existingEnd = sessionEndHour * 60 + sessionEndMinute

          // Check if time slots overlap
          const hasTimeOverlap = proposedStart < existingEnd && existingStart < proposedEnd

          if (hasTimeOverlap) {
            // Lookup class details for better conflict reporting
            const classDetails = await db.collection(CLASS_COLLECTION_NAME).findOne({ _id: session.classId })

            // Lookup room details
            const roomDetails = await db.collection(roomModel.ROOM_COLLECTION_NAME).findOne({ _id: session.roomId })

            // Find which trainer(s) from our list are in this session
            const conflictingTrainers = session.trainers.filter((trainerId) =>
              trainerObjectIds.some((tid) => tid.equals(trainerId))
            )

            for (const conflictingTrainerId of conflictingTrainers) {
              const trainerIdStr = conflictingTrainerId.toString()

              // Initialize trainer's conflict array if needed
              if (!conflictsByTrainer[trainerIdStr]) {
                conflictsByTrainer[trainerIdStr] = []
              }

              const conflict = {
                trainerId: trainerIdStr,
                type: 'CLASS_SESSION',
                dayOfWeek: dayOfWeek,
                proposedTimeSlot: {
                  start: `${String(startTime.hour).padStart(2, '0')}:${String(startTime.minute).padStart(2, '0')}`,
                  end: `${String(endTime.hour).padStart(2, '0')}:${String(endTime.minute).padStart(2, '0')}`,
                },
                conflictingSession: {
                  sessionId: session._id,
                  classId: session.classId,
                  className: classDetails?.name || 'Unknown Class',
                  title: session.title,
                  roomName: roomDetails?.name || 'Unknown Room',
                  startTime: session.startTime,
                  endTime: session.endTime,
                  timeSlot: {
                    start: `${String(sessionStartHour).padStart(2, '0')}:${String(sessionStartMinute).padStart(
                      2,
                      '0'
                    )}`,
                    end: `${String(sessionEndHour).padStart(2, '0')}:${String(sessionEndMinute).padStart(2, '0')}`,
                  },
                },
              }

              conflictsByTrainer[trainerIdStr].push(conflict)
              allConflicts.push(conflict)
            }
          }
        }
      }

      // 2. Check conflicts with BOOKINGS (through schedules) for ALL trainers
      // First, get all schedules for these trainers in the date range
      const trainerSchedules = await db
        .collection(scheduleModel.SCHEDULE_COLLECTION_NAME)
        .find({
          trainerId: { $in: trainerObjectIds },
          _destroy: false,
          startTime: { $lte: endDate },
          endTime: { $gte: startDate },
        })
        .toArray()

      // Check each schedule for conflicts
      for (const schedule of trainerSchedules) {
        const scheduleStart = new Date(schedule.startTime)
        const scheduleEnd = new Date(schedule.endTime)

        // Get day of week (1 = Monday, 7 = Sunday)
        const scheduleDayOfWeek = scheduleStart.getDay() === 0 ? 7 : scheduleStart.getDay()

        // Check if it's on the same day of week
        if (scheduleDayOfWeek === dayOfWeek) {
          // Extract time components from schedule
          const scheduleStartHour = scheduleStart.getHours()
          const scheduleStartMinute = scheduleStart.getMinutes()
          const scheduleEndHour = scheduleEnd.getHours()
          const scheduleEndMinute = scheduleEnd.getMinutes()

          // Convert times to minutes since midnight
          const proposedStart = startTime.hour * 60 + startTime.minute
          const proposedEnd = endTime.hour * 60 + endTime.minute
          const existingStart = scheduleStartHour * 60 + scheduleStartMinute
          const existingEnd = scheduleEndHour * 60 + scheduleEndMinute

          // Check if time slots overlap
          const hasTimeOverlap = proposedStart < existingEnd && existingStart < proposedEnd

          if (hasTimeOverlap) {
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

            const trainerIdStr = schedule.trainerId.toString()

            // Initialize trainer's conflict array if needed
            if (!conflictsByTrainer[trainerIdStr]) {
              conflictsByTrainer[trainerIdStr] = []
            }

            const conflict = {
              trainerId: trainerIdStr,
              type: 'BOOKING',
              dayOfWeek: dayOfWeek,
              proposedTimeSlot: {
                start: `${String(startTime.hour).padStart(2, '0')}:${String(startTime.minute).padStart(2, '0')}`,
                end: `${String(endTime.hour).padStart(2, '0')}:${String(endTime.minute).padStart(2, '0')}`,
              },
              conflictingBooking: {
                scheduleId: schedule._id,
                bookingId: booking?._id || null,
                isBooked: !!booking,
                clientName: userDetails?.fullName || 'Available slot',
                locationName: locationDetails?.name || '',
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                timeSlot: {
                  start: `${String(scheduleStartHour).padStart(2, '0')}:${String(scheduleStartMinute).padStart(
                    2,
                    '0'
                  )}`,
                  end: `${String(scheduleEndHour).padStart(2, '0')}:${String(scheduleEndMinute).padStart(2, '0')}`,
                },
                bookingStatus: booking?.status || 'AVAILABLE',
              },
            }

            conflictsByTrainer[trainerIdStr].push(conflict)
            allConflicts.push(conflict)
          }
        }
      }
    }

    // Get trainer details for the response
    const trainerDetails = {}
    if (Object.keys(conflictsByTrainer).length > 0) {
      const trainersWithConflicts = await db
        .collection(trainerModel.TRAINER_COLLECTION_NAME)
        .find({
          _id: { $in: Object.keys(conflictsByTrainer).map((id) => new ObjectId(id)) },
        })
        .toArray()

      // Get user details for trainers
      const userIds = trainersWithConflicts.map((t) => t.userId)
      const users = await db
        .collection(userModel.USER_COLLECTION_NAME)
        .find({
          _id: { $in: userIds },
        })
        .toArray()

      // Create a map of trainer details
      for (const trainer of trainersWithConflicts) {
        const user = users.find((u) => u._id.equals(trainer.userId))
        const trainerIdStr = trainer._id.toString()
        trainerDetails[trainerIdStr] = {
          trainerId: trainerIdStr,
          name: user?.fullName || 'Unknown Trainer',
          specialization: trainer.specialization,
          conflictCount: conflictsByTrainer[trainerIdStr].length,
          conflicts: conflictsByTrainer[trainerIdStr],
        }
      }
    }

    return {
      hasConflict: allConflicts.length > 0,
      totalConflictCount: allConflicts.length,
      trainersWithConflicts: Object.keys(conflictsByTrainer).length,
      trainerDetails: trainerDetails,
      allConflicts: allConflicts,
    }
  } catch (error) {
    throw new Error(`Error checking PT schedule conflict: ${error.message}`)
  }
}

const getMemberEnrolledClasses = async (userId) => {
  try {
    const db = await GET_DB()
    const userObjectId = new ObjectId(String(userId))

    const enrolledClasses = await db
      .collection(classEnrollmentModel.CLASS_ENROLLMENT_COLLECTION_NAME)
      .aggregate([
        // Match enrollments for this user that are not destroyed
        {
          $match: {
            userId: userObjectId,
            _destroy: false,
          },
        },
        // Lookup class details
        {
          $lookup: {
            from: CLASS_COLLECTION_NAME,
            localField: 'classId',
            foreignField: '_id',
            as: 'classDetails',
          },
        },
        {
          $unwind: '$classDetails',
        },
        // Filter out destroyed classes
        {
          $match: {
            'classDetails._destroy': false,
          },
        },
        // Lookup location details
        {
          $lookup: {
            from: locationModel.LOCATION_COLLECTION_NAME,
            localField: 'classDetails.locationId',
            foreignField: '_id',
            as: 'locationDetails',
          },
        },
        // Lookup trainer details
        {
          $lookup: {
            from: trainerModel.TRAINER_COLLECTION_NAME,
            localField: 'classDetails.trainers',
            foreignField: '_id',
            as: 'trainerDetails',
          },
        },
        // Lookup class enrollments to count total enrolled users
        {
          $lookup: {
            from: classEnrollmentModel.CLASS_ENROLLMENT_COLLECTION_NAME,
            localField: 'classDetails._id',
            foreignField: 'classId',
            as: 'allEnrollments',
          },
        },
        // Lookup class sessions
        {
          $lookup: {
            from: classSessionModel.CLASS_SESSION_COLLECTION_NAME,
            localField: 'classDetails._id',
            foreignField: 'classId',
            as: 'sessions',
          },
        },
        // Lookup rooms for class sessions
        {
          $lookup: {
            from: roomModel.ROOM_COLLECTION_NAME,
            localField: 'sessions.roomId',
            foreignField: '_id',
            as: 'roomDetails',
          },
        },
        // Lookup reviews for trainers to get ratings
        {
          $lookup: {
            from: reviewModel.REVIEW_COLLECTION_NAME,
            localField: 'classDetails.trainers',
            foreignField: 'trainerId',
            as: 'trainerReviews',
          },
        },
        // Lookup user details for trainers
        {
          $lookup: {
            from: userModel.USER_COLLECTION_NAME,
            localField: 'trainerDetails.userId',
            foreignField: '_id',
            as: 'trainerUsers',
          },
        },
        // Process the data
        {
          $addFields: {
            locationInfo: { $arrayElemAt: ['$locationDetails', 0] },
            enrolled: {
              $size: {
                $filter: {
                  input: '$allEnrollments',
                  cond: { $eq: ['$$this._destroy', false] },
                },
              },
            },
            // Process trainers with their ratings
            trainers: {
              $map: {
                input: '$trainerDetails',
                as: 'trainer',
                in: {
                  $let: {
                    vars: {
                      userDetail: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$trainerUsers',
                              cond: { $eq: ['$$this._id', '$$trainer.userId'] },
                            },
                          },
                          0,
                        ],
                      },
                      trainerReviews: {
                        $filter: {
                          input: '$trainerReviews',
                          cond: {
                            $and: [{ $eq: ['$$this.trainerId', '$$trainer._id'] }, { $eq: ['$$this._destroy', false] }],
                          },
                        },
                      },
                    },
                    in: {
                      _id: '$$trainer._id',
                      name: { $ifNull: ['$$userDetail.fullName', ''] },
                      avatar: { $ifNull: ['$$userDetail.avatar', ''] },
                      phone: { $ifNull: ['$$userDetail.phone', ''] },
                      specialization: '$$trainer.specialization',
                      rating: {
                        $cond: {
                          if: { $gt: [{ $size: '$$trainerReviews' }, 0] },
                          then: {
                            $round: [
                              {
                                $avg: {
                                  $map: {
                                    input: '$$trainerReviews',
                                    as: 'review',
                                    in: '$$review.rating',
                                  },
                                },
                              },
                              0,
                            ],
                          },
                          else: 0,
                        },
                      },
                    },
                  },
                },
              },
            },
            // Process class sessions with room info
            classSession: {
              $map: {
                input: {
                  $filter: {
                    input: '$sessions',
                    cond: { $eq: ['$$this._destroy', false] },
                  },
                },
                as: 'session',
                in: {
                  $let: {
                    vars: {
                      roomInfo: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$roomDetails',
                              cond: { $eq: ['$$this._id', '$$session.roomId'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: '$$session._id',
                      title: '$$session.title',
                      startTime: '$$session.startTime',
                      endTime: '$$session.endTime',
                      room: { $ifNull: ['$$roomInfo.name', ''] },
                    },
                  },
                },
              },
            },
          },
        },
        // Project final structure
        {
          $project: {
            _id: '$classDetails._id',
            name: '$classDetails.name',
            description: '$classDetails.description',
            capacity: '$classDetails.capacity',
            trainers: 1,
            classType: '$classDetails.classType',
            price: '$classDetails.price',
            startDate: '$classDetails.startDate',
            endDate: '$classDetails.endDate',
            enrolledAt: { $ifNull: ['$enrolledAt', ''] },
            paymentStatus: { $ifNull: ['$paymentStatus', ''] },
            recurrence: '$classDetails.recurrence',
            enrolled: 1,
            image: { $ifNull: ['$classDetails.image', ''] },
            locationName: { $ifNull: ['$locationInfo.name', ''] },
            address: {
              street: { $ifNull: ['$locationInfo.address.street', ''] },
              ward: { $ifNull: ['$locationInfo.address.ward', ''] },
              province: { $ifNull: ['$locationInfo.address.province', ''] },
            },
            classSession: 1,
          },
        },
        // Sort by enrollment date (most recent first)
        {
          $sort: { enrolledAt: -1 },
        },
      ])
      .toArray()

    return enrolledClasses
  } catch (error) {
    throw new Error(`Error getting member enrolled classes: ${error.message}`)
  }
}

const getClassesGroupedByLocation = async () => {
  try {
    const db = await GET_DB()
    const classesGroupedByLocation = await db
      .collection(CLASS_COLLECTION_NAME)
      .aggregate([
        // Match active classes only
        {
          $match: { _destroy: false },
        },
        // Lookup location details
        {
          $lookup: {
            from: locationModel.LOCATION_COLLECTION_NAME,
            localField: 'locationId',
            foreignField: '_id',
            as: 'locationDetails',
          },
        },
        // Lookup trainer details
        {
          $lookup: {
            from: trainerModel.TRAINER_COLLECTION_NAME,
            localField: 'trainers',
            foreignField: '_id',
            as: 'trainerDetails',
          },
        },
        // Lookup user details for trainers
        {
          $lookup: {
            from: userModel.USER_COLLECTION_NAME,
            localField: 'trainerDetails.userId',
            foreignField: '_id',
            as: 'trainerUsers',
          },
        },
        // Lookup class enrollments to count enrolled users
        {
          $lookup: {
            from: classEnrollmentModel.CLASS_ENROLLMENT_COLLECTION_NAME,
            localField: '_id',
            foreignField: 'classId',
            as: 'enrollments',
          },
        },
        // Process the data
        {
          $addFields: {
            locationInfo: { $arrayElemAt: ['$locationDetails', 0] },
            enrolledCount: {
              $size: {
                $filter: {
                  input: '$enrollments',
                  cond: { $eq: ['$$this._destroy', false] },
                },
              },
            },
            // Process trainers with user details
            processedTrainers: {
              $map: {
                input: '$trainerDetails',
                as: 'trainer',
                in: {
                  $let: {
                    vars: {
                      userDetail: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$trainerUsers',
                              cond: { $eq: ['$$this._id', '$$trainer.userId'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: '$$trainer._id',
                      name: { $ifNull: ['$$userDetail.fullName', ''] },
                      specialization: '$$trainer.specialization',
                    },
                  },
                },
              },
            },
            // Format schedule từ recurrence
            scheduleText: {
              $reduce: {
                input: '$recurrence',
                initialValue: '',
                in: {
                  $concat: [
                    '$$value',
                    {
                      $cond: {
                        if: { $eq: ['$$value', ''] },
                        then: '',
                        else: ', ',
                      },
                    },
                    {
                      $switch: {
                        branches: [
                          { case: { $eq: ['$$this.dayOfWeek', 1] }, then: 'Thứ 2' },
                          { case: { $eq: ['$$this.dayOfWeek', 2] }, then: 'Thứ 3' },
                          { case: { $eq: ['$$this.dayOfWeek', 3] }, then: 'Thứ 4' },
                          { case: { $eq: ['$$this.dayOfWeek', 4] }, then: 'Thứ 5' },
                          { case: { $eq: ['$$this.dayOfWeek', 5] }, then: 'Thứ 6' },
                          { case: { $eq: ['$$this.dayOfWeek', 6] }, then: 'Thứ 7' },
                          { case: { $eq: ['$$this.dayOfWeek', 7] }, then: 'CN' },
                        ],
                        default: 'Unknown',
                      },
                    },
                    ': ',
                    {
                      $concat: [
                        { $toString: '$$this.startTime.hour' },
                        ':',
                        {
                          $cond: {
                            if: { $lt: ['$$this.startTime.minute', 10] },
                            then: { $concat: ['0', { $toString: '$$this.startTime.minute' }] },
                            else: { $toString: '$$this.startTime.minute' },
                          },
                        },
                        '-',
                        { $toString: '$$this.endTime.hour' },
                        ':',
                        {
                          $cond: {
                            if: { $lt: ['$$this.endTime.minute', 10] },
                            then: { $concat: ['0', { $toString: '$$this.endTime.minute' }] },
                            else: { $toString: '$$this.endTime.minute' },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
        // Project final class structure
        {
          $project: {
            _id: 1,
            name: 1,
            classType: 1,
            price: 1,
            capacity: 1,
            enrolledCount: 1,
            scheduleText: 1,
            trainers: '$processedTrainers',
            locationInfo: {
              _id: '$locationInfo._id',
              name: { $ifNull: ['$locationInfo.name', ''] },
              address: {
                street: { $ifNull: ['$locationInfo.address.street', ''] },
                ward: { $ifNull: ['$locationInfo.address.ward', ''] },
                province: { $ifNull: ['$locationInfo.address.province', ''] },
              },
              phone: { $ifNull: ['$locationInfo.phone', ''] },
            },
          },
        },
        // Group by location
        {
          $group: {
            _id: '$locationInfo._id',
            locationName: { $first: '$locationInfo.name' },
            locationAddress: { $first: '$locationInfo.address' },
            locationPhone: { $first: '$locationInfo.phone' },
            classes: {
              $push: {
                _id: '$_id',
                name: '$name',
                classType: '$classType',
                price: '$price',
                capacity: '$capacity',
                enrolledCount: '$enrolledCount',
                schedule: '$scheduleText',
                trainers: '$trainers',
              },
            },
            totalClasses: { $sum: 1 },
          },
        },
        // Sort by location name
        {
          $sort: { locationName: 1 },
        },
      ])
      .toArray()

    return classesGroupedByLocation
  } catch (error) {
    throw new Error(`Error getting classes grouped by location: ${error.message}`)
  }
}

// Và thêm vào export
export const classModel = {
  CLASS_COLLECTION_NAME,
  CLASS_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getList,
  getListWithDetails,
  updateInfo,
  deleteClass,
  softDelete,
  getClassesByType,
  getListClassInfoForAdmin,
  getListClassInfoForUser,
  checkRoomScheduleConflict,
  checkPTScheduleConflict,
  getMemberEnrolledClasses,
  getListClassInfoForTrainer,
  getClassesGroupedByLocation, // ✅ NEW FUNCTION
}
