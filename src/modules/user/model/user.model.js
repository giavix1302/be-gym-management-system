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

// NEW: Xóa mềm user với validation
const softDeleteUser = async (userId) => {
  try {
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

const mockUsers = [
  {
    _id: 'user1',
    fullName: 'Nguyễn Văn An',
    email: 'nguyenvana@email.com',
    phone: '+84123456789',
    avatar: '',
    age: 25,
    dateOfBirth: '1998-05-15',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    gender: 'male',
    role: 'user',
    status: 'active', // có đăng kí gói tập, inactive: hết hạn, hoặc chưa đăng kí gói nào
    createdAt: '2024-01-15T00:00:00Z',
    subscriptions: [
      {
        _id: '',
        membershipId: '',
        status: 'active',
        startDate: '',
        endDate: '',
        remainingSessions: 1,
      },
    ],
    attendances: [
      {
        locationId: '',
        checkinTime: '',
        checkoutTime: '',
        hours: 0,
        method: '',
      },
    ],
  },
]

export const userModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getDetailByPhone,
  updateInfo,
  getListUserForStaff, // NEW
  softDeleteUser, // NEW
}
