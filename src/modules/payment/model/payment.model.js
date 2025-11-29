import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_TYPE } from '~/utils/constants.js'

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

  paymentStatus: Joi.string()
    .valid(PAYMENT_STATUS.PAID, PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.REFUNDED)
    .default(PAYMENT_STATUS.PAID),
  refundAmount: Joi.number().min(1).default(0),
  refundDate: Joi.string().isoDate().allow('').default(''),

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

// NEW: Tính tổng doanh thu theo năm (mặc định năm hiện tại)
const getTotalRevenueByYear = async (year = new Date().getFullYear()) => {
  try {
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`)
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`)

    const result = await GET_DB()
      .collection(PAYMENT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            _destroy: false,
            createdAt: {
              $gte: startOfYear.getTime(),
              $lte: endOfYear.getTime(),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
          },
        },
      ])
      .toArray()

    return {
      totalRevenue: result[0]?.totalRevenue || 0,
      totalTransactions: result[0]?.totalTransactions || 0,
      year: year,
    }
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Hàm linh hoạt để lấy dữ liệu chart doanh thu
const getRevenueChartData = async (options = {}) => {
  try {
    const {
      period = 'monthly', // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
      year = new Date().getFullYear(),
      month = null, // Chỉ dùng khi period = 'daily'
      groupBy = null, // 'paymentType', 'paymentMethod', null
      locationId = null, // Filter theo location (nếu có)
      limit = null, // Giới hạn số kết quả
    } = options

    let dateGrouping = {}
    let matchConditions = {
      _destroy: false,
    }

    // Xử lý filter theo thời gian
    if (period === 'daily' && month) {
      const startOfMonth = new Date(year, month - 1, 1)
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)
      matchConditions.createdAt = {
        $gte: startOfMonth.getTime(),
        $lte: endOfMonth.getTime(),
      }
      dateGrouping = {
        year: { $year: { $toDate: '$createdAt' } },
        month: { $month: { $toDate: '$createdAt' } },
        day: { $dayOfMonth: { $toDate: '$createdAt' } },
      }
    } else if (period === 'weekly') {
      const startOfYear = new Date(year, 0, 1)
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)
      matchConditions.createdAt = {
        $gte: startOfYear.getTime(),
        $lte: endOfYear.getTime(),
      }
      dateGrouping = {
        year: { $year: { $toDate: '$createdAt' } },
        week: { $week: { $toDate: '$createdAt' } },
      }
    } else if (period === 'monthly') {
      const startOfYear = new Date(year, 0, 1)
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)
      matchConditions.createdAt = {
        $gte: startOfYear.getTime(),
        $lte: endOfYear.getTime(),
      }
      dateGrouping = {
        year: { $year: { $toDate: '$createdAt' } },
        month: { $month: { $toDate: '$createdAt' } },
      }
    } else if (period === 'quarterly') {
      const startOfYear = new Date(year, 0, 1)
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)
      matchConditions.createdAt = {
        $gte: startOfYear.getTime(),
        $lte: endOfYear.getTime(),
      }
      dateGrouping = {
        year: { $year: { $toDate: '$createdAt' } },
        quarter: {
          $ceil: {
            $divide: [{ $month: { $toDate: '$createdAt' } }, 3],
          },
        },
      }
    } else if (period === 'yearly') {
      // Lấy 5 năm gần nhất
      const startYear = year - 4
      const startOfPeriod = new Date(startYear, 0, 1)
      const endOfPeriod = new Date(year, 11, 31, 23, 59, 59, 999)
      matchConditions.createdAt = {
        $gte: startOfPeriod.getTime(),
        $lte: endOfPeriod.getTime(),
      }
      dateGrouping = {
        year: { $year: { $toDate: '$createdAt' } },
      }
    }

    // Filter theo location nếu có
    if (locationId) {
      // Cần lookup với bookings để filter theo location
      // Sẽ implement trong pipeline
    }

    // Tạo grouping key
    let groupingKey = { ...dateGrouping }
    if (groupBy) {
      groupingKey[groupBy] = `$${groupBy}`
    }

    const pipeline = [{ $match: matchConditions }]

    // Nếu có filter location, thêm lookup
    if (locationId) {
      pipeline.push(
        {
          $lookup: {
            from: 'bookings',
            localField: 'referenceId',
            foreignField: '_id',
            as: 'booking',
          },
        },
        {
          $match: {
            $or: [
              { paymentType: { $ne: 'booking' } }, // Non-booking payments
              { 'booking.locationId': new ObjectId(String(locationId)) }, // Booking tại location cụ thể
            ],
          },
        }
      )
    }

    pipeline.push(
      {
        $group: {
          _id: groupingKey,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageAmount: { $avg: '$amount' },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.quarter': 1,
          '_id.month': 1,
          '_id.week': 1,
          '_id.day': 1,
        },
      }
    )

    if (limit) {
      pipeline.push({ $limit: limit })
    }

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Format kết quả theo period
    const formattedData = result.map((item) => {
      let label = ''
      let sortKey = ''

      if (period === 'daily') {
        label = `${item._id.day}/${item._id.month}/${item._id.year}`
        sortKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`
      } else if (period === 'weekly') {
        label = `Tuần ${item._id.week}/${item._id.year}`
        sortKey = `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`
      } else if (period === 'monthly') {
        const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
        label = `${monthNames[item._id.month - 1]} ${item._id.year}`
        sortKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
      } else if (period === 'quarterly') {
        label = `Q${item._id.quarter}/${item._id.year}`
        sortKey = `${item._id.year}-Q${item._id.quarter}`
      } else if (period === 'yearly') {
        label = `${item._id.year}`
        sortKey = `${item._id.year}`
      }

      const baseData = {
        label,
        period: sortKey,
        revenue: item.totalRevenue,
        transactions: item.totalTransactions,
        averageAmount: Math.round(item.averageAmount),
      }

      // Thêm groupBy data nếu có
      if (groupBy && item._id[groupBy]) {
        baseData[groupBy] = item._id[groupBy]
      }

      return baseData
    })

    return {
      data: formattedData,
      meta: {
        period,
        year,
        month,
        groupBy,
        totalRecords: formattedData.length,
        totalRevenue: formattedData.reduce((sum, item) => sum + item.revenue, 0),
        totalTransactions: formattedData.reduce((sum, item) => sum + item.transactions, 0),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Hàm đặc biệt cho so sánh doanh thu theo paymentType
const getRevenueByPaymentType = async (year = new Date().getFullYear()) => {
  try {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)

    const result = await GET_DB()
      .collection(PAYMENT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            _destroy: false,
            createdAt: {
              $gte: startOfYear.getTime(),
              $lte: endOfYear.getTime(),
            },
          },
        },
        {
          $group: {
            _id: {
              month: { $month: { $toDate: '$createdAt' } },
              paymentType: '$paymentType',
            },
            revenue: { $sum: '$amount' },
          },
        },
        {
          $group: {
            _id: '$_id.month',
            data: {
              $push: {
                type: '$_id.paymentType',
                revenue: '$revenue',
              },
            },
            totalRevenue: { $sum: '$revenue' },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ])
      .toArray()

    return result.map((item) => {
      const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
      return {
        month: monthNames[item._id - 1],
        membership: item.data.find((d) => d.type === 'membership')?.revenue || 0,
        booking: item.data.find((d) => d.type === 'booking')?.revenue || 0,
        class: item.data.find((d) => d.type === 'class')?.revenue || 0,
        total: item.totalRevenue,
      }
    })
  } catch (error) {
    throw new Error(error)
  }
}

export const paymentModel = {
  PAYMENT_COLLECTION_NAME,
  PAYMENT_COLLECTION_SCHEMA,
  createNew,
  getDetail,
  getPaymentsByUserId,
  getAllPaymentsForAdmin,
  getTotalRevenueByYear,
  getRevenueChartData,
  getRevenueByPaymentType,
}
