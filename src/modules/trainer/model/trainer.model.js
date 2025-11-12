import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'
import { APPROVED_TYPE, SPECIALIZATION_TYPE } from '~/utils/constants'

const TRAINER_COLLECTION_NAME = 'trainers'
const TRAINER_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),

  specialization: Joi.string()
    .valid(SPECIALIZATION_TYPE.GYM, SPECIALIZATION_TYPE.BOXING, SPECIALIZATION_TYPE.YOGA, SPECIALIZATION_TYPE.DANCE)
    .default(''),
  bio: Joi.string().trim().default(''),

  physiqueImages: Joi.array().items(Joi.string().trim().strict()).required(),

  isApproved: Joi.string()
    .valid(APPROVED_TYPE.APPROVED, APPROVED_TYPE.PENDING, APPROVED_TYPE.REJECTED)
    .default(APPROVED_TYPE.PENDING),

  approvedAt: Joi.string().isoDate().allow('').default(''),
  experience: Joi.string().trim().strict().default(''),
  education: Joi.string().trim().strict().default(''),
  pricePerHour: Joi.number().min(0).default(0),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await TRAINER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data, { abortEarly: false })
    const newTrainerToAdd = {
      ...validData,
      userId: new ObjectId(String(validData.userId)),
    }
    const created = await GET_DB().collection(TRAINER_COLLECTION_NAME).insertOne(newTrainerToAdd)
    return created
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailByUserId = async (userId) => {
  try {
    const result = GET_DB()
      .collection(TRAINER_COLLECTION_NAME)
      .findOne({
        userId: new ObjectId(String(userId)),
      })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (id) => {
  try {
    const result = GET_DB()
      .collection(TRAINER_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(id)),
      })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getListTrainerForUser = async () => {
  try {
    const result = await GET_DB()
      .collection(TRAINER_COLLECTION_NAME)
      .aggregate([
        // Match only approved trainers that are not destroyed
        {
          $match: {
            // isApproved: APPROVED_TYPE.APPROVED,
            _destroy: false,
          },
        },
        // Join with users collection to get user info
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        // Unwind user array (should be only one user per trainer)
        {
          $unwind: '$user',
        },
        // Join with schedules to get trainer's schedules
        {
          $lookup: {
            from: 'schedules',
            localField: '_id',
            foreignField: 'trainerId',
            as: 'schedules',
          },
        },
        // Join with ALL bookings to get complete booking list
        {
          $lookup: {
            from: 'bookings',
            pipeline: [
              {
                $match: {
                  _destroy: false,
                },
              },
              {
                $project: {
                  scheduleId: 1,
                },
              },
            ],
            as: 'allBookings',
          },
        },
        // Join with reviews to calculate average rating
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'trainerId',
            as: 'reviews',
          },
        },
        // Add fields to calculate review metrics and get booked schedule IDs
        {
          $addFields: {
            // Calculate average rating from reviews
            averageRating: {
              $cond: {
                if: { $gt: [{ $size: '$reviews' }, 0] },
                then: {
                  $round: [
                    {
                      $avg: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$reviews',
                              cond: { $eq: ['$$this._destroy', false] },
                            },
                          },
                          as: 'review',
                          in: '$$review.rating',
                        },
                      },
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
            // Count total completed bookings for this trainer
            totalBookings: {
              $size: {
                $filter: {
                  input: '$allBookings',
                  cond: {
                    $and: [{ $eq: ['$$this._destroy', false] }, { $eq: ['$$this.status', 'COMPLETED'] }],
                  },
                },
              },
            },
            // Get ALL booked schedule IDs from the entire bookings collection
            bookedScheduleIds: {
              $map: {
                input: '$allBookings',
                as: 'booking',
                in: '$$booking.scheduleId',
              },
            },
          },
        },
        // Add field for available schedules (not booked and not destroyed)
        {
          $addFields: {
            availableSchedules: {
              $filter: {
                input: '$schedules',
                cond: {
                  $and: [
                    { $eq: ['$$this._destroy', false] },
                    {
                      $not: {
                        $in: ['$$this._id', '$bookedScheduleIds'],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        // Project the final structure
        {
          $project: {
            userInfo: {
              fullName: '$user.fullName',
              avatar: '$user.avatar',
              email: '$user.email',
            },
            trainerInfo: {
              specialization: '$specialization',
              bio: '$bio',
              experience: '$experience',
              education: '$education',
              pricePerHour: '$pricePerHour',
              physiqueImages: '$physiqueImages',
            },
            schedule: {
              $map: {
                input: '$availableSchedules',
                as: 'sched',
                in: {
                  _id: '$$sched._id',
                  startTime: '$$sched.startTime',
                  endTime: '$$sched.endTime',
                },
              },
            },
            review: {
              rating: '$averageRating',
              totalBookings: '$totalBookings',
            },
          },
        },
        // Optional: Sort by rating and then by total bookings
        {
          $sort: {
            'review.rating': -1,
            'review.totalBookings': -1,
          },
        },
      ])
      .toArray()

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getListTrainerForAdmin = async () => {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const result = await GET_DB()
      .collection(TRAINER_COLLECTION_NAME)
      .aggregate([
        // Match all trainers (including destroyed ones for admin view)
        {
          $match: {
            _destroy: false,
          },
        },
        // Join with users collection to get user info
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: '$user',
        },
        // Join with schedules to get trainer's schedules (from today onwards)
        {
          $lookup: {
            from: 'schedules',
            let: { trainerId: '$_id', todayDate: todayStart },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$trainerId', '$$trainerId'] },
                      {
                        $gte: [{ $toDate: '$startTime' }, '$$todayDate'],
                      },
                      { $eq: ['$_destroy', false] },
                    ],
                  },
                },
              },
              {
                $sort: { startTime: 1 },
              },
            ],
            as: 'schedules',
          },
        },
        // Join with all bookings for this trainer (to get booking details for schedules)
        {
          $lookup: {
            from: 'bookings',
            let: { scheduleIds: '$schedules._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $in: ['$scheduleId', '$$scheduleIds'] }, { $eq: ['$_destroy', false] }],
                  },
                },
              },
              // Join with users to get customer fullName
              {
                $lookup: {
                  from: 'users',
                  localField: 'userId',
                  foreignField: '_id',
                  as: 'userInfo',
                },
              },
              {
                $unwind: '$userInfo',
              },
              // Join with locations to get location name
              {
                $lookup: {
                  from: 'locations',
                  localField: 'locationId',
                  foreignField: '_id',
                  as: 'locationInfo',
                },
              },
              {
                $unwind: '$locationInfo',
              },
              {
                $project: {
                  scheduleId: 1,
                  title: 1,
                  userName: '$userInfo.fullName',
                  locationName: '$locationInfo.name',
                },
              },
            ],
            as: 'scheduleBookings',
          },
        },
        // Join with all historical bookings for this trainer
        {
          $lookup: {
            from: 'bookings',
            let: { trainerId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_destroy', false] },
                },
              },
              // Join with schedules to filter by trainerId
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
              {
                $match: {
                  $expr: { $eq: ['$schedule.trainerId', '$$trainerId'] },
                },
              },
              // Join with users to get customer fullName
              {
                $lookup: {
                  from: 'users',
                  localField: 'userId',
                  foreignField: '_id',
                  as: 'userInfo',
                },
              },
              {
                $unwind: '$userInfo',
              },
              // Join with locations to get location name
              {
                $lookup: {
                  from: 'locations',
                  localField: 'locationId',
                  foreignField: '_id',
                  as: 'locationInfo',
                },
              },
              {
                $unwind: '$locationInfo',
              },
              {
                $project: {
                  fullName: '$userInfo.fullName',
                  startTime: '$schedule.startTime',
                  endTime: '$schedule.endTime',
                  locationName: '$locationInfo.name',
                  price: '$price',
                  status: '$status',
                },
              },
              {
                $sort: { startTime: -1 },
              },
            ],
            as: 'allBookings',
          },
        },
        // Join with reviews to get all reviews
        {
          $lookup: {
            from: 'reviews',
            let: { trainerId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$trainerId', '$$trainerId'] }, { $eq: ['$_destroy', false] }],
                  },
                },
              },
              // Join with users to get reviewer's fullName
              {
                $lookup: {
                  from: 'users',
                  localField: 'userId',
                  foreignField: '_id',
                  as: 'userInfo',
                },
              },
              {
                $unwind: '$userInfo',
              },
              {
                $project: {
                  fullName: '$userInfo.fullName',
                  rating: '$rating',
                  comment: '$comment',
                  createAt: '$createdAt',
                },
              },
              {
                $sort: { createAt: -1 },
              },
            ],
            as: 'reviews',
          },
        },
        // Add calculated fields
        {
          $addFields: {
            // Calculate total bookings (completed only)
            totalBookings: {
              $size: {
                $filter: {
                  input: '$allBookings',
                  cond: { $eq: ['$$this.status', 'completed'] },
                },
              },
            },
            // Calculate average rating
            rating: {
              $cond: {
                if: { $gt: [{ $size: '$reviews' }, 0] },
                then: {
                  $round: [
                    {
                      $avg: '$reviews.rating',
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
            // Calculate total revenue (completed bookings only)
            revenue: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$allBookings',
                      cond: true, // { $eq: ['$$this.status', 'completed'] },
                    },
                  },
                  as: 'booking',
                  in: '$$booking.price',
                },
              },
            },
          },
        },
        // Map schedules with booking information
        {
          $addFields: {
            schedule: {
              $map: {
                input: '$schedules',
                as: 'sched',
                in: {
                  $let: {
                    vars: {
                      bookingDetail: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$scheduleBookings',
                              cond: { $eq: ['$$this.scheduleId', '$$sched._id'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      startTime: '$$sched.startTime',
                      endTime: '$$sched.endTime',
                      title: {
                        $cond: {
                          if: { $ifNull: ['$$bookingDetail', false] },
                          then: '$$bookingDetail.title',
                          else: 'Unbooked Schedule',
                        },
                      },
                      userName: {
                        $cond: {
                          if: { $ifNull: ['$$bookingDetail', false] },
                          then: '$$bookingDetail.userName',
                          else: '',
                        },
                      },
                      locationName: {
                        $cond: {
                          if: { $ifNull: ['$$bookingDetail', false] },
                          then: '$$bookingDetail.locationName',
                          else: '',
                        },
                      },
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
            trainerId: { $toString: '$_id' },
            userInfo: {
              name: '$user.fullName',
              avatar: '$user.avatar',
              email: '$user.email',
              phone: '$user.phone',
              age: '$user.age',
            },
            trainerInfo: {
              specialization: '$specialization',
              bio: '$bio',
              physiqueImages: '$physiqueImages',
              isApproved: '$isApproved',
              approvedAt: '$approvedAt',
              experience: '$experience',
              education: '$education',
              pricePerHour: '$pricePerHour',
            },
            totalBookings: '$totalBookings',
            rating: '$rating',
            totalReviews: { $size: '$reviews' },
            revenue: '$revenue',
            schedule: '$schedule',
            booked: '$allBookings',
            review: '$reviews',
          },
        },
        // Sort by rating and total bookings
        {
          $sort: {
            rating: -1,
            totalBookings: -1,
          },
        },
      ])
      .toArray()

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (trainerId, updateData) => {
  try {
    const updated = await GET_DB()
      .collection(TRAINER_COLLECTION_NAME)
      .findOneAndUpdate({ _id: new ObjectId(String(trainerId)) }, { $set: updateData }, { returnDocument: 'after' })
    return updated
  } catch (error) {
    throw new Error(error)
  }
}

export const trainerModel = {
  TRAINER_COLLECTION_NAME,
  TRAINER_COLLECTION_SCHEMA,
  createNew,
  getDetailByUserId,
  getDetailById,
  getListTrainerForUser,
  getListTrainerForAdmin,
  updateInfo,
}
