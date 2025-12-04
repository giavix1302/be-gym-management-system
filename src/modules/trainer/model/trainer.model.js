import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'
import { APPROVED_TYPE, BOOKING_STATUS, SPECIALIZATION_TYPE } from '~/utils/constants'
import { bookingModel } from '~/modules/booking/model/booking.model'

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
              phone: '$user.phone',
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

const getListBookingByTrainerId = async (trainerId, page = 1, limit = 10) => {
  try {
    const db = GET_DB()
    const skip = (page - 1) * limit

    const pipeline = [
      // Join với schedules để lấy thông tin schedule của trainer
      {
        $lookup: {
          from: 'schedules',
          localField: 'scheduleId',
          foreignField: '_id',
          as: 'schedule',
        },
      },
      // Unwind schedule array
      {
        $unwind: '$schedule',
      },
      // Match bookings thuộc về trainer cụ thể và có status completed
      {
        $match: {
          'schedule.trainerId': new ObjectId(String(trainerId)),
          'schedule._destroy': false,
          status: 'completed', // Chỉ lấy booking completed
          _destroy: false,
        },
      },
      // Join với users để lấy thông tin user đã booking
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      // Unwind user array
      {
        $unwind: '$user',
      },
      // Join với locations để lấy thông tin location
      {
        $lookup: {
          from: 'locations',
          localField: 'locationId',
          foreignField: '_id',
          as: 'location',
        },
      },
      // Unwind location array
      {
        $unwind: '$location',
      },
      // Project theo cấu trúc yêu cầu
      {
        $project: {
          _id: 1,
          title: 1,
          price: 1,
          userName: '$user.fullName', // userId -> fullName
          locationName: '$location.name', // locationId -> name
          createAt: '$createdAt', // Sử dụng createAt như yêu cầu
        },
      },
      // Sort theo thời gian tạo mới nhất
      {
        $sort: { createdAt: -1 },
      },
      // Pagination
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]

    // Thực hiện aggregation để lấy data
    const bookings = await db.collection(bookingModel.BOOKING_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Đếm tổng số booking completed của trainer để tính pagination
    const totalBookingsPipeline = [
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
          'schedule.trainerId': new ObjectId(String(trainerId)),
          'schedule._destroy': false,
          status: 'completed',
          _destroy: false,
        },
      },
      {
        $count: 'total',
      },
    ]

    const totalResult = await db
      .collection(bookingModel.BOOKING_COLLECTION_NAME)
      .aggregate(totalBookingsPipeline)
      .toArray()
    const totalBookings = totalResult[0]?.total || 0
    const totalPages = Math.ceil(totalBookings / limit)

    return {
      data: bookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalPayments: totalBookings, // Sử dụng totalPayments như yêu cầu
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  } catch (error) {
    throw new Error(`Error getting trainer bookings: ${error.message}`)
  }
}

const getTotalApprovedTrainers = async () => {
  try {
    const totalApprovedTrainers = await GET_DB().collection(TRAINER_COLLECTION_NAME).countDocuments({
      _destroy: false,
      isApproved: APPROVED_TYPE.APPROVED,
    })

    return totalApprovedTrainers
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Lấy top 3 trainer có doanh thu cao nhất
const getTopTrainersByRevenue = async (year = new Date().getFullYear(), limit = 3) => {
  try {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)

    const result = await GET_DB()
      .collection('bookings')
      .aggregate([
        {
          $match: {
            _destroy: false,
            status: 'completed', // Chỉ tính booking đã completed
            createdAt: {
              $gte: startOfYear.getTime(),
              $lte: endOfYear.getTime(),
            },
          },
        },
        // Join với schedules để lấy trainerId
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
        // Filter schedule chưa bị xóa
        {
          $match: {
            'schedule._destroy': false,
          },
        },
        // Group theo trainerId để tính tổng doanh thu và sessions
        {
          $group: {
            _id: '$schedule.trainerId',
            totalRevenue: { $sum: '$price' }, // Tổng doanh thu từ price
            totalSessions: { $sum: 1 }, // Tổng số booking completed
            bookings: { $push: '$$ROOT' }, // Lưu lại thông tin booking để debug
          },
        },
        // Join với trainers để lấy thông tin trainer
        {
          $lookup: {
            from: 'trainers',
            localField: '_id',
            foreignField: '_id',
            as: 'trainer',
          },
        },
        {
          $unwind: '$trainer',
        },
        // Filter trainer chưa bị xóa và đã approved
        {
          $match: {
            'trainer._destroy': false,
            'trainer.isApproved': 'approved',
          },
        },
        // Join với users để lấy tên trainer
        {
          $lookup: {
            from: 'users',
            localField: 'trainer.userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: '$user',
        },
        // Project theo format yêu cầu
        {
          $project: {
            id: { $toString: '$_id' },
            name: '$user.fullName',
            revenue: '$totalRevenue',
            sessions: '$totalSessions',
            // Thêm thông tin bổ sung (optional)
            specialization: '$trainer.specialization',
            pricePerHour: '$trainer.pricePerHour',
            avatar: '$user.avatar',
          },
        },
        // Sắp xếp theo doanh thu giảm dần
        {
          $sort: { revenue: -1 },
        },
        // Giới hạn top 3
        {
          $limit: limit,
        },
      ])
      .toArray()

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Lấy thống kê trainer chi tiết (có thể filter theo khoảng thời gian)
const getTrainerRevenueStats = async (options = {}) => {
  try {
    const {
      startDate = null,
      endDate = null,
      trainerId = null,
      includeAll = false, // Include tất cả trainer hay chỉ approved
    } = options

    let matchConditions = {
      _destroy: false,
      status: 'completed',
    }

    // Filter theo thời gian
    if (startDate && endDate) {
      matchConditions.createdAt = {
        $gte: new Date(startDate).getTime(),
        $lte: new Date(endDate).getTime(),
      }
    }

    const pipeline = [
      { $match: matchConditions },
      // Join với schedules
      {
        $lookup: {
          from: 'schedules',
          localField: 'scheduleId',
          foreignField: '_id',
          as: 'schedule',
        },
      },
      { $unwind: '$schedule' },
      {
        $match: {
          'schedule._destroy': false,
        },
      },
    ]

    // Filter theo trainer cụ thể nếu có
    if (trainerId) {
      pipeline.push({
        $match: {
          'schedule.trainerId': new ObjectId(String(trainerId)),
        },
      })
    }

    pipeline.push(
      // Group theo trainerId
      {
        $group: {
          _id: '$schedule.trainerId',
          totalRevenue: { $sum: '$price' },
          totalSessions: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          bookingDates: { $push: '$createdAt' },
        },
      },
      // Join với trainers
      {
        $lookup: {
          from: 'trainers',
          localField: '_id',
          foreignField: '_id',
          as: 'trainer',
        },
      },
      { $unwind: '$trainer' }
    )

    // Filter approved trainers nếu không includeAll
    if (!includeAll) {
      pipeline.push({
        $match: {
          'trainer._destroy': false,
          'trainer.isApproved': 'approved',
        },
      })
    }

    pipeline.push(
      // Join với users
      {
        $lookup: {
          from: 'users',
          localField: 'trainer.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      // Project kết quả
      {
        $project: {
          id: { $toString: '$_id' },
          name: '$user.fullName',
          revenue: '$totalRevenue',
          sessions: '$totalSessions',
          averagePrice: { $round: ['$averagePrice', 0] },
          specialization: '$trainer.specialization',
          pricePerHour: '$trainer.pricePerHour',
          isApproved: '$trainer.isApproved',
          avatar: '$user.avatar',
          email: '$user.email',
        },
      },
      // Sort theo revenue
      {
        $sort: { revenue: -1 },
      }
    )

    const result = await GET_DB().collection('bookings').aggregate(pipeline).toArray()

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getTotalPendingTrainers = async () => {
  try {
    const totalPendingTrainers = await GET_DB().collection(TRAINER_COLLECTION_NAME).countDocuments({
      _destroy: false,
      isApproved: APPROVED_TYPE.PENDING,
    })

    return totalPendingTrainers
  } catch (error) {
    throw new Error(error)
  }
}

const getTrainerDashboardStatsByUserId = async (userId) => {
  try {
    const db = GET_DB()
    const now = new Date()

    // Tính thời gian đầu tuần (thứ 2) và cuối tuần (chủ nhật)
    const startOfWeek = new Date(now)
    const dayOfWeek = startOfWeek.getDay() // 0 = chủ nhật, 1 = thứ 2, ...
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Về thứ 2
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    // Tính thời gian đầu tháng và cuối tháng
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999)

    // Lấy trainer record để có trainerId
    const trainer = await db.collection('trainers').findOne({
      userId: new ObjectId(String(userId)),
      _destroy: false,
    })

    if (!trainer) {
      throw new Error('Trainer not found')
    }

    const trainerId = trainer._id

    // 1. Số lượng buổi dạy kèm trong tuần này (booking)
    const weeklyBookingStats = await db
      .collection('bookings')
      .aggregate([
        {
          $match: {
            _destroy: false,
            status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.BOOKING, BOOKING_STATUS.COMPLETED] },
          },
        },
        // Join với schedules để lấy trainerId và thời gian
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
        // Filter theo trainer và tuần này
        {
          $match: {
            'schedule.trainerId': trainerId,
            'schedule._destroy': false,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$schedule.startTime' } }, startOfWeek] },
                { $lte: [{ $dateFromString: { dateString: '$schedule.startTime' } }, endOfWeek] },
              ],
            },
          },
        },
        {
          $count: 'total',
        },
      ])
      .toArray()

    const weeklyBookingSessions = weeklyBookingStats[0]?.total || 0

    // 2. Số lượng buổi dạy lớp trong tuần này (classSession)
    const weeklyClassStats = await db
      .collection('class_sessions')
      .aggregate([
        {
          $match: {
            _destroy: false,
            trainers: trainerId,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$startTime' } }, startOfWeek] },
                { $lte: [{ $dateFromString: { dateString: '$startTime' } }, endOfWeek] },
              ],
            },
          },
        },
        {
          $count: 'total',
        },
      ])
      .toArray()

    const weeklyClassSessions = weeklyClassStats[0]?.total || 0

    // 3. Số lượng buổi đã hoàn thành trong tháng này (cả booking và class)

    // 3a. Booking đã hoàn thành trong tháng này
    const monthlyCompletedBookings = await db
      .collection('bookings')
      .aggregate([
        {
          $match: {
            _destroy: false,
            status: BOOKING_STATUS.COMPLETED,
          },
        },
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
            'schedule.trainerId': trainerId,
            'schedule._destroy': false,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$schedule.endTime' } }, startOfMonth] },
                { $lte: [{ $dateFromString: { dateString: '$schedule.endTime' } }, endOfMonth] },
                { $lt: [{ $dateFromString: { dateString: '$schedule.endTime' } }, now] },
              ],
            },
          },
        },
        {
          $count: 'total',
        },
      ])
      .toArray()

    // 3b. ClassSession đã hoàn thành trong tháng này
    const monthlyCompletedClasses = await db
      .collection('class_sessions')
      .aggregate([
        {
          $match: {
            _destroy: false,
            trainers: trainerId,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$endTime' } }, startOfMonth] },
                { $lte: [{ $dateFromString: { dateString: '$endTime' } }, endOfMonth] },
                { $lt: [{ $dateFromString: { dateString: '$endTime' } }, now] },
              ],
            },
          },
        },
        {
          $count: 'total',
        },
      ])
      .toArray()

    const monthlyCompletedSessions =
      (monthlyCompletedBookings[0]?.total || 0) + (monthlyCompletedClasses[0]?.total || 0)

    // 4. Doanh thu trong tháng này

    // 4a. Doanh thu từ booking đã hoàn thành
    const monthlyBookingRevenue = await db
      .collection('bookings')
      .aggregate([
        {
          $match: {
            _destroy: false,
            status: BOOKING_STATUS.COMPLETED,
          },
        },
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
            'schedule.trainerId': trainerId,
            'schedule._destroy': false,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$schedule.endTime' } }, startOfMonth] },
                { $lte: [{ $dateFromString: { dateString: '$schedule.endTime' } }, endOfMonth] },
                { $lt: [{ $dateFromString: { dateString: '$schedule.endTime' } }, now] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$price' },
          },
        },
      ])
      .toArray()

    // 4b. Doanh thu từ class sessions đã hoàn thành
    const monthlyClassRevenue = await db
      .collection('class_sessions')
      .aggregate([
        {
          $match: {
            _destroy: false,
            trainers: trainerId,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$endTime' } }, startOfMonth] },
                { $lte: [{ $dateFromString: { dateString: '$endTime' } }, endOfMonth] },
                { $lt: [{ $dateFromString: { dateString: '$endTime' } }, now] },
              ],
            },
          },
        },
        // Join với classes để lấy ratePerClassSession
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
          $group: {
            _id: null,
            totalRevenue: { $sum: '$class.ratePerClassSession' },
          },
        },
      ])
      .toArray()

    const monthlyRevenue = (monthlyBookingRevenue[0]?.totalRevenue || 0) + (monthlyClassRevenue[0]?.totalRevenue || 0)

    return {
      weeklyBookingSessions,
      weeklyClassSessions,
      monthlyCompletedSessions,
      monthlyRevenue,
      // Thêm metadata để debug nếu cần
      metadata: {
        trainerId: trainerId.toString(),
        calculatedAt: now.toISOString(),
        periodInfo: {
          weekStart: startOfWeek.toISOString(),
          weekEnd: endOfWeek.toISOString(),
          monthStart: startOfMonth.toISOString(),
          monthEnd: endOfMonth.toISOString(),
        },
      },
    }
  } catch (error) {
    throw new Error(`Error getting trainer dashboard stats: ${error.message}`)
  }
}

const getTrainerEventsForThreeMonths = async (userId) => {
  try {
    // Tính toán khoảng thời gian 3 tháng (tháng hiện tại, tháng trước, tháng sau)
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Tháng trước (tháng hiện tại - 1)
    const startDate = new Date(currentYear, currentMonth - 1, 1)
    // Tháng sau (cuối tháng hiện tại + 1)
    const endDate = new Date(currentYear, currentMonth + 2, 0, 23, 59, 59, 999)

    const startISO = startDate.toISOString()
    const endISO = endDate.toISOString()

    const db = GET_DB()

    // Tìm trainerId từ userId
    const trainer = await db.collection(TRAINER_COLLECTION_NAME).findOne({
      userId: new ObjectId(String(userId)),
      _destroy: false,
    })

    if (!trainer) {
      throw new Error('Trainer not found')
    }

    const trainerId = trainer._id

    // 1. Lấy booking events của trainer trong 3 tháng
    const bookingEvents = await db
      .collection('bookings')
      .aggregate([
        // Match bookings chưa bị xóa
        {
          $match: {
            _destroy: false,
          },
        },
        // Join với schedules để lấy thông tin thời gian và trainerId
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
        // Filter theo trainerId và thời gian 3 tháng
        {
          $match: {
            'schedule.trainerId': trainerId,
            'schedule._destroy': false,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$schedule.startTime' } }, new Date(startISO)] },
                { $lte: [{ $dateFromString: { dateString: '$schedule.startTime' } }, new Date(endISO)] },
              ],
            },
          },
        },
        // Join với users để lấy thông tin user đã đặt booking (khách hàng)
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'bookingUser',
          },
        },
        {
          $unwind: '$bookingUser',
        },
        // Join với locations để lấy tên location
        {
          $lookup: {
            from: 'locations',
            localField: 'locationId',
            foreignField: '_id',
            as: 'location',
          },
        },
        {
          $unwind: '$location',
        },
        // Project theo format yêu cầu cho booking
        {
          $project: {
            _id: 1,
            title: 1,
            startTime: '$schedule.startTime',
            endTime: '$schedule.endTime',
            locationName: '$location.name',
            userName: '$bookingUser.fullName', // Tên khách hàng
            note: 1, // Note của booking
            price: 1, // THÊM: Giá của booking
            eventType: { $literal: 'booking' },
          },
        },
      ])
      .toArray()

    // 2. Lấy class session events của trainer trong 3 tháng
    const classSessionEvents = await db
      .collection('class_sessions')
      .aggregate([
        // Match class sessions có trainer này và trong khoảng thời gian
        {
          $match: {
            trainers: trainerId,
            _destroy: false,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$startTime' } }, new Date(startISO)] },
                { $lte: [{ $dateFromString: { dateString: '$startTime' } }, new Date(endISO)] },
              ],
            },
          },
        },
        // Join với classes để lấy thông tin class
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
        // Join với rooms để lấy thông tin room
        {
          $lookup: {
            from: 'rooms',
            localField: 'roomId',
            foreignField: '_id',
            as: 'room',
          },
        },
        {
          $unwind: '$room',
        },
        // Join với locations để lấy tên location
        {
          $lookup: {
            from: 'locations',
            localField: 'room.locationId',
            foreignField: '_id',
            as: 'location',
          },
        },
        {
          $unwind: '$location',
        },
        // THÊM: Join với class_enrollments để đếm số học viên đã đăng ký
        {
          $lookup: {
            from: 'class_enrollments',
            localField: 'classId',
            foreignField: 'classId',
            pipeline: [
              {
                $match: {
                  _destroy: false,
                  status: { $in: ['active', 'pending', 'completed'] }, // Chỉ tính enrollment active
                },
              },
            ],
            as: 'enrollments',
          },
        },
        // Lookup tất cả sessions của class để tính totalSessions và sessionNumber
        {
          $lookup: {
            from: 'class_sessions',
            let: { classId: '$classId', currentStartTime: '$startTime' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$classId', '$$classId'] }, { $eq: ['$_destroy', false] }],
                  },
                },
              },
              {
                $sort: { startTime: 1 },
              },
              {
                $project: {
                  startTime: 1,
                },
              },
            ],
            as: 'allSessions',
          },
        },
        // Tính sessionNumber, totalSessions và enrolledCount
        {
          $addFields: {
            totalSessions: { $size: '$allSessions' },
            enrolledCount: { $size: '$enrollments' }, // THÊM: Số học viên đã đăng ký
            sessionNumber: {
              $add: [
                {
                  $size: {
                    $filter: {
                      input: '$allSessions',
                      as: 'session',
                      cond: {
                        $lt: [
                          { $dateFromString: { dateString: '$$session.startTime' } },
                          { $dateFromString: { dateString: '$startTime' } },
                        ],
                      },
                    },
                  },
                },
                1, // +1 vì đếm từ 1, không phải 0
              ],
            },
          },
        },
        // Project theo format yêu cầu cho classSession
        {
          $project: {
            _id: 1,
            title: '$class.name', // Lấy tên class làm title
            startTime: 1,
            endTime: 1,
            locationName: '$location.name',
            roomName: '$room.name',
            sessionNumber: 1,
            totalSessions: 1,
            enrolledCount: 1, // THÊM: Số học viên đã đăng ký
            capacity: '$class.capacity', // THÊM: Sức chứa của class
            eventType: { $literal: 'classSession' },
          },
        },
      ])
      .toArray()

    // 3. Kết hợp và format lại dữ liệu theo cấu trúc yêu cầu
    const allEvents = []

    // Thêm booking events
    bookingEvents.forEach((event) => {
      allEvents.push({
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        locationName: event.locationName,
        userName: event.userName, // Tên khách hàng đã đặt booking
        note: event.note,
        price: event.price, // THÊM: Giá booking
      })
    })

    // Thêm classSession events
    classSessionEvents.forEach((event) => {
      allEvents.push({
        title: event.title, // Tên class
        startTime: event.startTime,
        endTime: event.endTime,
        locationName: event.locationName,
        roomName: event.roomName,
        sessionNumber: event.sessionNumber, // Buổi thứ mấy (tính từ 1)
        totalSessions: event.totalSessions, // Tổng số buổi của class
        enrolledCount: event.enrolledCount, // THÊM: Số học viên đã đăng ký
        capacity: event.capacity, // THÊM: Sức chứa của class
      })
    })

    // 4. Sort tất cả events theo thời gian
    allEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

    return allEvents
  } catch (error) {
    throw new Error(`Error getting trainer events for three months: ${error.message}`)
  }
}

const hasTrainerSchedules = async (userId) => {
  try {
    const db = GET_DB()
    const now = new Date()

    // Tìm trainer từ userId
    const trainer = await db.collection(TRAINER_COLLECTION_NAME).findOne({
      userId: new ObjectId(String(userId)),
      _destroy: false,
    })

    if (!trainer) {
      return false
    }

    const trainerId = trainer._id

    // 1. Kiểm tra booking schedules đang diễn ra
    const activeBookings = await db
      .collection('bookings')
      .aggregate([
        {
          $match: {
            _destroy: false,
            status: { $in: [BOOKING_STATUS.BOOKING, BOOKING_STATUS.PENDING] },
          },
        },
        // Join với schedules
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
        // Filter theo trainerId và thời gian hiện tại
        {
          $match: {
            'schedule.trainerId': trainerId,
            'schedule._destroy': false,
            $expr: {
              $and: [
                // Lịch đã bắt đầu hoặc sắp bắt đầu (trong vòng 30 phút)
                {
                  $lte: [
                    { $dateFromString: { dateString: '$schedule.startTime' } },
                    new Date(now.getTime() + 30 * 60 * 1000), // +30 phút
                  ],
                },
                // Lịch chưa kết thúc
                {
                  $gt: [{ $dateFromString: { dateString: '$schedule.endTime' } }, now],
                },
              ],
            },
          },
        },
        {
          $limit: 1,
        },
      ])
      .toArray()

    // 2. Kiểm tra class sessions đang diễn ra
    const activeClassSessions = await db
      .collection('class_sessions')
      .aggregate([
        {
          $match: {
            trainers: trainerId,
            _destroy: false,
            $expr: {
              $and: [
                // Class đã bắt đầu hoặc sắp bắt đầu (trong vòng 30 phút)
                {
                  $lte: [
                    { $dateFromString: { dateString: '$startTime' } },
                    new Date(now.getTime() + 30 * 60 * 1000), // +30 phút
                  ],
                },
                // Class chưa kết thúc
                {
                  $gt: [{ $dateFromString: { dateString: '$endTime' } }, now],
                },
              ],
            },
          },
        },
        {
          $limit: 1,
        },
      ])
      .toArray()

    // Trả về true nếu có ít nhất 1 lịch đang hoạt động
    return activeBookings.length > 0 || activeClassSessions.length > 0
  } catch (error) {
    throw new Error(`Error checking trainer schedules: ${error.message}`)
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
  getListBookingByTrainerId,
  updateInfo,
  getTotalApprovedTrainers,

  getTopTrainersByRevenue,
  getTrainerRevenueStats,

  getTotalPendingTrainers,
  getTrainerDashboardStatsByUserId,

  getTrainerEventsForThreeMonths,

  hasTrainerSchedules,
}
