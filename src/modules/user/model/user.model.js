/* eslint-disable indent */
import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { USER_TYPES, GENDER_TYPE, STATUS_TYPE, SUBSCRIPTION_STATUS } from '~/utils/constants.js'

const USER_COLLECTION_NAME = 'users'
const USER_COLLECTION_SCHEMA = Joi.object({
  fullName: Joi.string().min(2).trim().strict().default(''),
  email: Joi.string().email().trim().strict().default(''),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/) // E.164: +[country code][subscriber number]
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format (e.g., +84901234567).',
    })
    .required(),
  avatar: Joi.string().trim().strict().default(''),
  password: Joi.string().required().trim().strict(),
  age: Joi.number().min(1).max(120).default(null),
  dateOfBirth: Joi.string().isoDate().allow('').default(''), // 13/02/2004
  address: Joi.string().trim().strict().default(''),
  gender: Joi.string().valid(GENDER_TYPE.MALE, GENDER_TYPE.FEMALE, GENDER_TYPE.OTHER).default(null),

  role: Joi.string().valid(USER_TYPES.USER, USER_TYPES.ADMIN, USER_TYPES.PT, USER_TYPES.STAFF).default(USER_TYPES.USER),

  status: Joi.string().valid(STATUS_TYPE.ACTIVE, STATUS_TYPE.INACTIVE).required(),

  qrCode: Joi.string().trim().strict().default(''),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await USER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data, { abortEarly: false })
    const createdUser = await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validData)
    return createdUser
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (userId) => {
  try {
    const user = GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(userId)),
      })
    return user
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailByPhone = async (phone) => {
  try {
    const user = GET_DB().collection(USER_COLLECTION_NAME).findOne({
      phone: phone,
    })
    return user
  } catch (error) {
    console.error(error)
    throw error
  }
}

const updateInfo = async (userId, data) => {
  try {
    const updatedUser = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOneAndUpdate({ _id: new ObjectId(String(userId)) }, { $set: data }, { returnDocument: 'after' })
    return updatedUser
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Lấy danh sách user cho admin với pagination và populate đầy đủ thông tin
const getListUserForAdmin = async (page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit

    // Tính ngày 30 ngày trước
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Aggregate pipeline để populate subscriptions, attendances và bookings
    const pipeline = [
      // Lọc user chưa bị xóa mềm và chỉ lấy role = "user"
      {
        $match: {
          _destroy: false,
          role: 'user',
        },
      },
      // Lookup subscriptions
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'userId',
          as: 'subscriptions',
          pipeline: [
            {
              $match: {
                _destroy: false,
              },
            },
            {
              $sort: { createdAt: -1 },
            },
            // Chỉ lấy các field cần thiết và tính toán remainingDays
            {
              $addFields: {
                remainingDays: {
                  $cond: {
                    if: { $eq: ['$status', 'active'] },
                    then: {
                      $max: [
                        0,
                        {
                          $ceil: {
                            $divide: [
                              {
                                $subtract: [{ $dateFromString: { dateString: '$endDate' } }, new Date()],
                              },
                              1000 * 60 * 60 * 24, // milliseconds in a day
                            ],
                          },
                        },
                      ],
                    },
                    else: 0,
                  },
                },
              },
            },
            // Project để loại bỏ các field không cần thiết
            {
              $project: {
                _id: 1,
                userId: 1,
                membershipId: 1,
                status: 1,
                paymentStatus: 1,
                startDate: 1,
                endDate: 1,
                remainingSessions: '$remainingDays', // Đổi tên từ remainingDays thành remainingSessions để tương thích với frontend
              },
            },
          ],
        },
      },
      // Lookup attendances - chỉ lấy 30 ngày gần nhất
      {
        $lookup: {
          from: 'attendances',
          localField: '_id',
          foreignField: 'userId',
          as: 'attendances',
          pipeline: [
            {
              $match: {
                _destroy: false,
                checkinTime: { $gte: thirtyDaysAgo.toISOString() },
              },
            },
            {
              $sort: { checkinTime: -1 },
            },
            // Chỉ lấy các field cần thiết
            {
              $project: {
                _id: 1,
                locationId: 1,
                checkinTime: 1,
                checkoutTime: 1,
                hours: 1,
                method: 1,
              },
            },
          ],
        },
      },
      // Lookup bookings với đầy đủ thông tin
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'userId',
          as: 'bookings',
          pipeline: [
            {
              $match: {
                _destroy: false,
              },
            },
            // Join với schedules để lấy thông tin thời gian
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
            // Join với trainers để lấy thông tin trainer
            {
              $lookup: {
                from: 'trainers',
                localField: 'schedule.trainerId',
                foreignField: '_id',
                as: 'trainer',
              },
            },
            {
              $unwind: '$trainer',
            },
            // Join với users để lấy tên trainer
            {
              $lookup: {
                from: 'users',
                localField: 'trainer.userId',
                foreignField: '_id',
                as: 'trainerUser',
              },
            },
            {
              $unwind: '$trainerUser',
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
            // Project thông tin booking
            {
              $project: {
                _id: 1,
                title: 1,
                trainerName: '$trainerUser.fullName',
                startTime: '$schedule.startTime',
                endTime: '$schedule.endTime',
                status: 1,
                price: 1,
                locationName: '$location.name',
                note: 1,
                createdAt: 1,
              },
            },
            {
              $sort: { createdAt: -1 },
            },
          ],
        },
      },
      // Chỉ lấy các field cần thiết của user
      {
        $project: {
          _id: 1,
          phone: 1,
          fullName: 1,
          email: 1,
          avatar: 1,
          age: 1,
          dateOfBirth: 1,
          address: 1,
          gender: 1,
          role: 1,
          status: 1,
          qrCode: 1,
          createdAt: 1,
          subscriptions: 1,
          attendances: 1,
          booking: '$bookings', // Map bookings thành booking để match với mock data
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

    const users = await GET_DB().collection(USER_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Đếm tổng số user để tính pagination (chỉ đếm user có role = "user")
    const totalUsers = await GET_DB().collection(USER_COLLECTION_NAME).countDocuments({
      _destroy: false,
      role: 'user',
    })

    const totalPages = Math.ceil(totalUsers / limit)

    return {
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Lấy danh sách user cho staff với pagination và populate đầy đủ thông tin
const getListUserForStaff = async (page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit

    // Tính ngày 30 ngày trước
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Aggregate pipeline để populate subscriptions và attendances
    const pipeline = [
      // Lọc user chưa bị xóa mềm và chỉ lấy role = "user"
      {
        $match: {
          _destroy: false,
          role: 'user',
        },
      },
      // Lookup subscriptions
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'userId',
          as: 'subscriptions',
          pipeline: [
            {
              $match: {
                _destroy: false,
              },
            },
            {
              $sort: { createdAt: -1 },
            },
            // Chỉ lấy các field cần thiết và tính toán remainingDays
            {
              $addFields: {
                remainingDays: {
                  $cond: {
                    if: { $eq: ['$status', 'active'] },
                    then: {
                      $max: [
                        0,
                        {
                          $ceil: {
                            $divide: [
                              {
                                $subtract: [{ $dateFromString: { dateString: '$endDate' } }, new Date()],
                              },
                              1000 * 60 * 60 * 24, // milliseconds in a day
                            ],
                          },
                        },
                      ],
                    },
                    else: 0,
                  },
                },
              },
            },
            // Project để loại bỏ các field không cần thiết
            {
              $project: {
                _id: 1,
                userId: 1,
                membershipId: 1,
                status: 1,
                paymentStatus: 1,
                startDate: 1,
                endDate: 1,
                remainingSessions: '$remainingDays', // Đổi tên từ remainingDays thành remainingSessions để tương thích với frontend
              },
            },
          ],
        },
      },
      // Lookup attendances - chỉ lấy 30 ngày gần nhất
      {
        $lookup: {
          from: 'attendances',
          localField: '_id',
          foreignField: 'userId',
          as: 'attendances',
          pipeline: [
            {
              $match: {
                _destroy: false,
                checkinTime: { $gte: thirtyDaysAgo.toISOString() },
              },
            },
            {
              $sort: { checkinTime: -1 },
            },
            // Chỉ lấy các field cần thiết
            {
              $project: {
                _id: 1,
                locationId: 1,
                checkinTime: 1,
                checkoutTime: 1,
                hours: 1,
                method: 1,
              },
            },
          ],
        },
      },
      // Chỉ lấy các field cần thiết của user
      {
        $project: {
          _id: 1,
          phone: 1,
          fullName: 1,
          email: 1,
          avatar: 1,
          age: 1,
          dateOfBirth: 1,
          address: 1,
          gender: 1,
          role: 1,
          status: 1,
          qrCode: 1,
          createdAt: 1,
          subscriptions: 1,
          attendances: 1,
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

    const users = await GET_DB().collection(USER_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Đếm tổng số user để tính pagination (chỉ đếm user có role = "user")
    const totalUsers = await GET_DB().collection(USER_COLLECTION_NAME).countDocuments({
      _destroy: false,
      role: 'user',
    })

    const totalPages = Math.ceil(totalUsers / limit)

    return {
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Xóa mềm user với validation cải tiến (bao gồm check booking tương lai)
const softDeleteUser = async (userId) => {
  try {
    const now = new Date()

    // Kiểm tra user có tồn tại không
    const existingUser = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(userId)),
        _destroy: false,
      })

    if (!existingUser) {
      return {
        success: false,
        message: 'User not found or already deleted',
      }
    }

    // Kiểm tra user có subscription active không
    const activeSubscription = await GET_DB()
      .collection('subscriptions')
      .findOne({
        userId: new ObjectId(String(userId)),
        status: SUBSCRIPTION_STATUS.ACTIVE,
        _destroy: false,
      })

    if (activeSubscription) {
      return {
        success: false,
        message: 'Cannot delete user with active subscription. Please expire the subscription first.',
      }
    }

    // Kiểm tra user có đang check-in không (có attendance chưa checkout)
    const activeAttendance = await GET_DB()
      .collection('attendances')
      .findOne({
        userId: new ObjectId(String(userId)),
        checkoutTime: '',
        _destroy: false,
      })

    if (activeAttendance) {
      return {
        success: false,
        message: 'Cannot delete user who is currently checked in. Please checkout first.',
      }
    }

    // NEW: Kiểm tra user có booking chưa kết thúc không
    const activeBookings = await GET_DB()
      .collection('bookings')
      .aggregate([
        // Match bookings của user
        {
          $match: {
            userId: new ObjectId(String(userId)),
            _destroy: false,
          },
        },
        // Join với schedules để lấy thông tin thời gian
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
        // Lọc những booking có endTime > hiện tại (booking chưa kết thúc)
        {
          $match: {
            $expr: {
              $gt: [{ $dateFromString: { dateString: '$schedule.endTime' } }, now],
            },
            'schedule._destroy': false,
          },
        },
        // Chỉ cần 1 record để check
        {
          $limit: 1,
        },
      ])
      .toArray()

    if (activeBookings.length > 0) {
      return {
        success: false,
        message: 'Cannot delete user with ongoing or upcoming bookings. Please wait until all bookings are completed.',
      }
    }

    // Thực hiện xóa mềm
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(userId)) },
        {
          $set: {
            _destroy: true,
            updatedAt: Date.now(),
          },
        },
        { returnDocument: 'after' }
      )

    if (result) {
      return {
        success: true,
        message: 'User deleted successfully',
        user: result,
      }
    } else {
      return {
        success: false,
        message: 'Failed to delete user',
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}
const getTotalActiveUsers = async () => {
  try {
    const totalActiveUsers = await GET_DB().collection(USER_COLLECTION_NAME).countDocuments({
      _destroy: false,
      role: USER_TYPES.USER, // Chỉ đếm user, không đếm admin/pt/staff
    })

    return totalActiveUsers
  } catch (error) {
    throw new Error(error)
  }
}

// Helper: convert ISO week number to date (Monday of that week)
const getDateFromISOWeek = (year, week) => {
  // ISO weeks start on Monday; set to the first Monday of the year then advance by (week-1)
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const dayOfWeek = simple.getUTCDay() || 7 // Sunday returns 0, change to 7
  if (dayOfWeek !== 1) {
    // Shift back to Monday
    simple.setUTCDate(simple.getUTCDate() + 1 - dayOfWeek)
  }
  return simple
}

const getUserEventsForThreeMonths = async (userId, options = {}) => {
  try {
    // ========== DESTRUCTURE OPTIONS VỚI GIÁ TRỊ MẶC ĐỊNH ==========
    const {
      // FILTER THEO THỜI GIAN
      viewType = 'threeMonths', // 'day' | 'week' | 'month' | 'threeMonths' | 'range'
      date = new Date(), // Ngày làm mốc (cho day/week/month)
      year = null, // Năm cụ thể (ví dụ: 2025)
      month = null, // Tháng cụ thể (1-12)
      week = null, // {number|null} Tuần trong năm (1-53, ISO week). VD: 43, 1, 52
      startDate = null, // {Date|string|null} Ngày bắt đầu (cho range). VD: new Date('2025-12-01'), '2025-12-01', new Date()
      endDate = null, // {Date|string|null} Ngày kết thúc (cho range). VD: new Date('2025-12-31'), '2025-12-31', new Date()

      // FILTER THEO LOẠI SỰ KIỆN
      eventTypes = [], // ['booking', 'classSession'] - Rỗng = lấy tất cả

      // FILTER THEO ĐỊA ĐIỂM
      locationIds = [], // Array ObjectId của locations
      locationNames = [], // Array tên locations

      // FILTER THEO TRAINER
      trainerIds = [], // Array ObjectId của trainers
      trainerNames = [], // Array tên trainers

      // FILTER THEO PHÒNG (chỉ cho classSession)
      roomIds = [], // Array ObjectId của rooms
      roomNames = [], // Array tên rooms

      // SẮP XẾP
      sortBy = 'startTime', // 'startTime' | 'endTime' | 'title'
      sortOrder = 'asc', // 'asc' | 'desc'

      // PHÂN TRANG
      page = null, // Số trang (null = không phân trang)
      limit = null, // Số lượng mỗi trang

      // LOẠI TRỪ SỰ KIỆN QUÁ KHỨ
      includePastEvents = true, // Có lấy sự kiện đã qua không

      // TIMEZONE (để convert nếu cần)
      timezone = 'Asia/Ho_Chi_Minh',
    } = options

    // ========== TÍNH TOÁN KHOẢNG THỜI GIAN ==========
    let startISO, endISO

    switch (viewType) {
      case 'day': {
        // Lấy sự kiện trong 1 ngày
        const targetDate = date
        const start = new Date(targetDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(targetDate)
        end.setHours(23, 59, 59, 999)

        startISO = start.toISOString()
        endISO = end.toISOString()
        break
      }

      case 'week': {
        // Lấy sự kiện trong 1 tuần (ISO week: Thứ 2 - Chủ nhật)
        let targetDate

        if (year && week) {
          // Nếu có year và week, tính toán ngày đầu tuần đó
          targetDate = getDateFromISOWeek(year, week)
        } else {
          targetDate = new Date(date)
        }

        // Tìm ngày Thứ 2 của tuần
        const dayOfWeek = targetDate.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Chủ nhật = 0, cần lùi 6 ngày

        const start = new Date(targetDate)
        start.setDate(targetDate.getDate() + diff)
        start.setHours(0, 0, 0, 0)

        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)

        startISO = start.toISOString()
        endISO = end.toISOString()
        break
      }

      case 'month': {
        // Lấy sự kiện trong 1 tháng
        let targetYear, targetMonth

        if (year !== null && month !== null) {
          targetYear = year
          targetMonth = month - 1 // JavaScript month: 0-11
        } else {
          const targetDate = new Date(date)
          targetYear = targetDate.getFullYear()
          targetMonth = targetDate.getMonth()
        }

        const start = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0)
        const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999)

        startISO = start.toISOString()
        endISO = end.toISOString()
        break
      }

      case 'threeMonths': {
        // Lấy sự kiện trong 3 tháng (tháng trước, tháng này, tháng sau)
        const now = date
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        // Tháng trước (ngày 1)
        const start = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0)

        // Tháng sau (ngày cuối)
        const end = new Date(currentYear, currentMonth + 2, 0, 23, 59, 59, 999)

        startISO = start.toISOString()
        endISO = end.toISOString()
        break
      }

      case 'range': {
        // Lấy sự kiện trong khoảng thời gian tùy chỉnh
        if (!startDate || !endDate) {
          throw new Error('startDate and endDate are required for viewType "range"')
        }

        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        startISO = start.toISOString()
        endISO = end.toISOString()
        break
      }

      default:
        throw new Error(`Invalid viewType: ${viewType}`)
    }

    const db = GET_DB()

    // ========== XÂY DỰNG MATCH CONDITION CHO BOOKINGS ==========
    const bookingMatchConditions = {
      userId: new ObjectId(String(userId)),
      _destroy: false,
    }

    // Thêm filter locationIds cho bookings
    if (locationIds.length > 0) {
      bookingMatchConditions.locationId = {
        $in: locationIds.map((id) => new ObjectId(String(id))),
      }
    }

    // ========== XÂY DỰNG MATCH CONDITION CHO CLASS SESSIONS ==========
    const classSessionMatchConditions = {
      users: new ObjectId(String(userId)),
      _destroy: false,
    }

    // Thêm filter roomIds cho class sessions
    if (roomIds.length > 0) {
      classSessionMatchConditions.roomId = {
        $in: roomIds.map((id) => new ObjectId(String(id))),
      }
    }

    // ========== 1. LẤY BOOKINGS ==========
    let bookingEvents = []

    // Chỉ query bookings nếu không filter hoặc có 'booking' trong eventTypes
    if (eventTypes.length === 0 || eventTypes.includes('booking')) {
      const bookingPipeline = [
        // Match bookings của user chưa bị xóa
        {
          $match: bookingMatchConditions,
        },
        // Join với schedules để lấy thời gian
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
        // Filter theo thời gian
        {
          $match: {
            'schedule._destroy': false,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$schedule.startTime' } }, new Date(startISO)] },
                { $lte: [{ $dateFromString: { dateString: '$schedule.startTime' } }, new Date(endISO)] },
              ],
            },
          },
        },
        // Join với trainers để lấy thông tin trainer
        {
          $lookup: {
            from: 'trainers',
            localField: 'schedule.trainerId',
            foreignField: '_id',
            as: 'trainer',
          },
        },
        {
          $unwind: '$trainer',
        },
        // Join với users để lấy tên trainer
        {
          $lookup: {
            from: 'users',
            localField: 'trainer.userId',
            foreignField: '_id',
            as: 'trainerUser',
          },
        },
        {
          $unwind: '$trainerUser',
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
      ]

      // Thêm filter theo locationNames nếu có
      if (locationNames.length > 0) {
        bookingPipeline.push({
          $match: {
            'location.name': { $in: locationNames },
          },
        })
      }

      // Thêm filter theo trainerIds nếu có
      if (trainerIds.length > 0) {
        bookingPipeline.push({
          $match: {
            'trainer._id': { $in: trainerIds.map((id) => new ObjectId(String(id))) },
          },
        })
      }

      // Thêm filter theo trainerNames nếu có
      if (trainerNames.length > 0) {
        bookingPipeline.push({
          $match: {
            'trainerUser.fullName': { $in: trainerNames },
          },
        })
      }

      // Project theo format yêu cầu cho booking
      bookingPipeline.push({
        $project: {
          _id: 1,
          title: 1,
          startTime: '$schedule.startTime',
          endTime: '$schedule.endTime',
          locationName: '$location.name',
          locationId: '$location._id',
          trainerName: '$trainerUser.fullName',
          trainerId: '$trainer._id',
          eventType: { $literal: 'booking' },
          status: 1, // Giả sử có trường status
        },
      })

      bookingEvents = await db.collection('bookings').aggregate(bookingPipeline).toArray()
    }

    // ========== 2. LẤY CLASS SESSIONS ==========
    let classSessionEvents = []

    // Chỉ query class sessions nếu không filter hoặc có 'classSession' trong eventTypes
    if (eventTypes.length === 0 || eventTypes.includes('classSession')) {
      const classSessionPipeline = [
        // Match class sessions có user này
        {
          $match: classSessionMatchConditions,
        },
        // Filter theo thời gian
        {
          $match: {
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$startTime' } }, new Date(startISO)] },
                { $lte: [{ $dateFromString: { dateString: '$startTime' } }, new Date(endISO)] },
              ],
            },
          },
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
        // Join với trainers để lấy thông tin trainers
        {
          $lookup: {
            from: 'trainers',
            localField: 'trainers',
            foreignField: '_id',
            as: 'trainerDetails',
          },
        },
        // Join với users để lấy tên trainers
        {
          $lookup: {
            from: 'users',
            localField: 'trainerDetails.userId',
            foreignField: '_id',
            as: 'trainerUsers',
          },
        },
      ]

      // Thêm filter theo locationNames nếu có
      if (locationNames.length > 0) {
        classSessionPipeline.push({
          $match: {
            'location.name': { $in: locationNames },
          },
        })
      }

      // Thêm filter theo roomNames nếu có
      if (roomNames.length > 0) {
        classSessionPipeline.push({
          $match: {
            'room.name': { $in: roomNames },
          },
        })
      }

      // Thêm filter theo trainerIds nếu có (ít nhất 1 trainer trong array trùng)
      if (trainerIds.length > 0) {
        classSessionPipeline.push({
          $match: {
            'trainerDetails._id': {
              $in: trainerIds.map((id) => new ObjectId(String(id))),
            },
          },
        })
      }

      // Thêm filter theo trainerNames nếu có
      if (trainerNames.length > 0) {
        classSessionPipeline.push({
          $match: {
            'trainerUsers.fullName': { $in: trainerNames },
          },
        })
      }

      // Project theo format yêu cầu cho classSession
      classSessionPipeline.push({
        $project: {
          _id: 1,
          title: 1,
          startTime: 1,
          endTime: 1,
          locationName: '$location.name',
          locationId: '$location._id',
          roomName: '$room.name',
          roomId: '$room._id',
          trainerName: {
            $map: {
              input: '$trainerUsers',
              as: 'trainer',
              in: '$$trainer.fullName',
            },
          },
          trainerIds: '$trainerDetails._id',
          eventType: { $literal: 'classSession' },
          status: 1, // Giả sử có trường status
        },
      })

      classSessionEvents = await db.collection('class_sessions').aggregate(classSessionPipeline).toArray()
    }

    // ========== 3. KẾT HỢP VÀ FORMAT DỮ LIỆU ==========
    const allEvents = []

    // Thêm booking events
    bookingEvents.forEach((event) => {
      allEvents.push({
        _id: event._id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        locationName: event.locationName,
        locationId: event.locationId,
        trainerName: event.trainerName, // string
        trainerId: event.trainerId,
        eventType: 'booking',
        status: event.status,
      })
    })

    // Thêm classSession events
    classSessionEvents.forEach((event) => {
      allEvents.push({
        _id: event._id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        locationName: event.locationName,
        locationId: event.locationId,
        roomName: event.roomName,
        roomId: event.roomId,
        trainerName: event.trainerName, // array
        trainerIds: event.trainerIds,
        eventType: 'classSession',
        status: event.status,
      })
    })

    // ========== 4. LOẠI TRỪ SỰ KIỆN QUÁ KHỨ (NẾU CẦN) ==========
    let filteredEvents = allEvents

    if (!includePastEvents) {
      const now = new Date()
      filteredEvents = allEvents.filter((event) => {
        const eventDate = new Date(event.startTime)
        return eventDate >= now
      })
    }

    // ========== 5. SẮP XẾP ==========
    filteredEvents.sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]

      let comparison = 0
      if (sortBy === 'startTime' || sortBy === 'endTime') {
        comparison = new Date(aValue) - new Date(bValue)
      } else {
        comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    // ========== 6. PHÂN TRANG (NẾU CẦN) ==========
    if (page !== null && limit !== null) {
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedEvents = filteredEvents.slice(startIndex, endIndex)

      return {
        events: paginatedEvents,
        pagination: {
          page,
          limit,
          total: filteredEvents.length,
          totalPages: Math.ceil(filteredEvents.length / limit),
          hasMore: endIndex < filteredEvents.length,
        },
      }
    }

    // ========== 7. TRẢ VỀ KẾT QUẢ ==========
    return filteredEvents
  } catch (error) {
    throw new Error(`Error getting user events: ${error.message}`)
  }
}

const getUserEventsForSevenDays = async (userId) => {
  try {
    // Tính toán khoảng thời gian 7 ngày tới
    const now = new Date()
    const startDate = new Date() // Từ hiện tại
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 ngày

    const startISO = startDate.toISOString()
    const endISO = endDate.toISOString()

    console.log('7-day range:', { startISO, endISO })

    const db = GET_DB()

    // 1. Lấy bookings của user trong 7 ngày tới
    const bookingEvents = await db
      .collection('bookings')
      .aggregate([
        // Match bookings của user chưa bị xóa
        {
          $match: {
            userId: new ObjectId(String(userId)),
            _destroy: false,
          },
        },
        // Join với schedules để lấy thời gian
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
        // Filter theo thời gian 7 ngày tới
        {
          $match: {
            'schedule._destroy': false,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$schedule.startTime' } }, new Date(startISO)] },
                { $lte: [{ $dateFromString: { dateString: '$schedule.startTime' } }, new Date(endISO)] },
              ],
            },
          },
        },
        // Join với trainers để lấy thông tin trainer
        {
          $lookup: {
            from: 'trainers',
            localField: 'schedule.trainerId',
            foreignField: '_id',
            as: 'trainer',
          },
        },
        {
          $unwind: '$trainer',
        },
        // Join với users để lấy tên trainer
        {
          $lookup: {
            from: 'users',
            localField: 'trainer.userId',
            foreignField: '_id',
            as: 'trainerUser',
          },
        },
        {
          $unwind: '$trainerUser',
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
            trainerName: '$trainerUser.fullName',
            eventType: { $literal: 'booking' }, // Đánh dấu là booking
            // Thêm fields hữu ích cho 7 ngày tới
            dayOfWeek: {
              $dayOfWeek: { $dateFromString: { dateString: '$schedule.startTime' } },
            },
            dateOnly: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $dateFromString: { dateString: '$schedule.startTime' } },
              },
            },
            timeOnly: {
              $dateToString: {
                format: '%H:%M',
                date: { $dateFromString: { dateString: '$schedule.startTime' } },
              },
            },
          },
        },
        // Sort theo thời gian
        {
          $sort: { startTime: 1 },
        },
      ])
      .toArray()

    // 2. Lấy classSession của user trong 7 ngày tới
    const classSessionEvents = await db
      .collection('class_sessions')
      .aggregate([
        // Match class sessions có user này và trong khoảng thời gian
        {
          $match: {
            users: new ObjectId(String(userId)),
            _destroy: false,
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$startTime' } }, new Date(startISO)] },
                { $lte: [{ $dateFromString: { dateString: '$startTime' } }, new Date(endISO)] },
              ],
            },
          },
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
        // Join với trainers để lấy thông tin trainers
        {
          $lookup: {
            from: 'trainers',
            localField: 'trainers',
            foreignField: '_id',
            as: 'trainerDetails',
          },
        },
        // Join với users để lấy tên trainers
        {
          $lookup: {
            from: 'users',
            localField: 'trainerDetails.userId',
            foreignField: '_id',
            as: 'trainerUsers',
          },
        },
        // Project theo format yêu cầu cho classSession
        {
          $project: {
            _id: 1,
            title: 1,
            startTime: 1,
            endTime: 1,
            locationName: '$location.name',
            roomName: '$room.name',
            trainerName: {
              $map: {
                input: '$trainerUsers',
                as: 'trainer',
                in: '$$trainer.fullName',
              },
            },
            eventType: { $literal: 'classSession' }, // Đánh dấu là classSession
            // Thêm fields hữu ích cho 7 ngày tới
            dayOfWeek: {
              $dayOfWeek: { $dateFromString: { dateString: '$startTime' } },
            },
            dateOnly: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $dateFromString: { dateString: '$startTime' } },
              },
            },
            timeOnly: {
              $dateToString: {
                format: '%H:%M',
                date: { $dateFromString: { dateString: '$startTime' } },
              },
            },
          },
        },
        // Sort theo thời gian
        {
          $sort: { startTime: 1 },
        },
      ])
      .toArray()

    // 3. Kết hợp và format lại dữ liệu
    const allEvents = []

    // Thêm booking events
    bookingEvents.forEach((event) => {
      allEvents.push({
        _id: event._id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        locationName: event.locationName,
        trainerName: event.trainerName, // string
        eventType: 'booking',
        // Format date/time cho 7 ngày tới
        date: event.dateOnly,
        time: event.timeOnly,
        dayOfWeek: event.dayOfWeek,
      })
    })

    // Thêm classSession events
    classSessionEvents.forEach((event) => {
      allEvents.push({
        _id: event._id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        locationName: event.locationName,
        roomName: event.roomName,
        trainerName: event.trainerName, // array
        eventType: 'classSession',
        // Format date/time cho 7 ngày tới
        date: event.dateOnly,
        time: event.timeOnly,
        dayOfWeek: event.dayOfWeek,
      })
    })

    // 4. Sort tất cả events theo thời gian
    allEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

    console.log(`Found ${allEvents.length} events in next 7 days for user ${userId}`)

    return allEvents
  } catch (error) {
    throw new Error(`Error getting user events for seven days: ${error.message}`)
  }
}
export const userModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getDetailByPhone,
  updateInfo,
  getListUserForAdmin, // NEW
  getListUserForStaff, // NEW
  softDeleteUser, // NEW (improved)
  getTotalActiveUsers,
  getUserEventsForThreeMonths,
  getUserEventsForSevenDays,
}
