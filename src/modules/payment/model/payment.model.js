import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'
import { PAYMENT_METHOD, PAYMENT_TYPE } from '~/utils/constants.js'

const PAYMENT_COLLECTION_NAME = 'payments'
const PAYMENT_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  referenceId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  paymentType: Joi.string().valid(PAYMENT_TYPE.MEMBERSHIP, PAYMENT_TYPE.BOOKING, PAYMENT_TYPE.CLASS),
  amount: Joi.number().min(1).required(),
  paymentDate: Joi.string().isoDate().allow('').default(''),
  paymentMethod: Joi.string().valid(
    PAYMENT_METHOD.CASH,
    PAYMENT_METHOD.BANK,
    PAYMENT_METHOD.MOMO,
    PAYMENT_METHOD.VNPAY
  ),
  description: Joi.string().trim().strict(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await PAYMENT_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data, { abortEarly: false })
    const newPaymentToAdd = {
      ...validData,
      userId: new ObjectId(String(validData.userId)),
      referenceId: new ObjectId(String(validData.referenceId)),
    }
    const createdPayment = await GET_DB().collection(PAYMENT_COLLECTION_NAME).insertOne(newPaymentToAdd)
    return createdPayment
  } catch (error) {
    throw new Error(error)
  }
}

const getDetail = async (userId) => {
  try {
    const user = GET_DB()
      .collection(PAYMENT_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(userId)),
      })
    return user
  } catch (error) {
    throw new Error(error)
  }
}

// Lấy danh sách payment theo userId với pagination
const getPaymentsByUserId = async (userId, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit

    const pipeline = [
      // Match payments của user cụ thể
      {
        $match: {
          userId: new ObjectId(String(userId)),
          _destroy: false,
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

    const payments = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Đếm tổng số payment của user
    const totalPayments = await GET_DB()
      .collection(PAYMENT_COLLECTION_NAME)
      .countDocuments({
        userId: new ObjectId(String(userId)),
        _destroy: false,
      })

    const totalPages = Math.ceil(totalPayments / limit)

    return {
      payments,
      pagination: {
        currentPage: page,
        totalPages,
        totalPayments,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Lấy danh sách tất cả payment cho admin với thông tin user
const getAllPaymentsForAdmin = async (page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit

    const pipeline = [
      // Match payments chưa bị xóa mềm
      {
        $match: {
          _destroy: false,
        },
      },
      // Lookup thông tin user
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                fullName: 1,
                email: 1,
                phone: 1,
                avatar: 1,
                age: 1,
                dateOfBirth: 1,
                address: 1,
                gender: 1,
                role: 1,
                status: 1,
              },
            },
          ],
        },
      },
      // Unwind user array (vì lookup trả về array)
      {
        $unwind: '$user',
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

    const payments = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Đếm tổng số payment
    const totalPayments = await GET_DB().collection(PAYMENT_COLLECTION_NAME).countDocuments({
      _destroy: false,
    })

    const totalPages = Math.ceil(totalPayments / limit)

    return {
      payments,
      pagination: {
        currentPage: page,
        totalPages,
        totalPayments,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const mockPayments = [
  {
    _id: 'payment1',
    userId: 'user1',
    referenceId: 'ref1',
    paymentType: 'membership',
    amount: 500000,
    paymentDate: '',
    paymentMethod: 'vnpay',
    description: 'Payment for gym membership package',
    user: {
      fullName: 'Nguyễn Văn An',
      email: 'nguyenvanan@gmail.com',
      phone: '0912345678',
      avatar: 'https://i.pravatar.cc/150?img=1',
      age: 25,
      dateOfBirth: '',
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      gender: 'male',
      role: 'member',
      status: 'active',
    },
  },
]

export const paymentModel = {
  PAYMENT_COLLECTION_NAME,
  PAYMENT_COLLECTION_SCHEMA,
  createNew,
  getDetail,
  getPaymentsByUserId,
  getAllPaymentsForAdmin,
}
