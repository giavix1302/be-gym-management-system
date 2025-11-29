import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb.config.js'
import { PAYMENT_STATUS, PAYMENT_TYPE, PAYMENT_METHOD } from '~/utils/constants.js'

const PAYMENT_COLLECTION_NAME = 'payments'

/**
 * ============================================
 * 4 THỐNG KÊ TỔNG QUAN (CARDS)
 * ============================================
 */

/**
 * Lấy tổng quan thống kê payments (4 cards)
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Object} Thống kê tổng quan
 */
const getOverviewStats = async (startDate = null, endDate = null) => {
  try {
    const matchCondition = {}

    // Thêm filter theo thời gian nếu có (sử dụng createdAt timestamp)
    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime(),
      }
    }

    const pipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          // Card 1: Tổng doanh thu (chỉ tính paid)
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, '$amount', 0],
            },
          },
          // Card 2: Số giao dịch thành công
          successfulTransactions: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, 1, 0],
            },
          },
          // Card 3: Tổng amount của paid (để tính trung bình)
          totalPaidAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, '$amount', 0],
            },
          },
          paidCount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, 1, 0],
            },
          },
          // Card 4: Tổng tiền hoàn trả
          totalRefunded: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.REFUNDED] }, '$refundAmount', 0],
            },
          },
          // Thống kê bổ sung
          totalTransactions: { $sum: 1 },
          unpaidTransactions: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.UNPAID] }, 1, 0],
            },
          },
          refundedTransactions: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.REFUNDED] }, 1, 0],
            },
          },
        },
      },
    ]

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    if (result.length === 0) {
      return {
        totalRevenue: 0,
        successfulTransactions: 0,
        averageTransactionAmount: 0,
        totalRefunded: 0,
        totalTransactions: 0,
        unpaidTransactions: 0,
        refundedTransactions: 0,
      }
    }

    const data = result[0]

    return {
      totalRevenue: data.totalRevenue || 0,
      successfulTransactions: data.successfulTransactions || 0,
      averageTransactionAmount: data.paidCount > 0 ? Math.round(data.totalPaidAmount / data.paidCount) : 0,
      totalRefunded: data.totalRefunded || 0,
      totalTransactions: data.totalTransactions || 0,
      unpaidTransactions: data.unpaidTransactions || 0,
      refundedTransactions: data.refundedTransactions || 0,
    }
  } catch (error) {
    throw new Error(`Error getting overview stats: ${error.message}`)
  }
}

/**
 * ============================================
 * BIỂU ĐỒ 1: DOANH THU THEO LOẠI THANH TOÁN
 * ============================================
 */

/**
 * Lấy doanh thu theo paymentType (membership, booking, class)
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Array} Doanh thu theo loại thanh toán
 */
const getRevenueByPaymentType = async (startDate = null, endDate = null) => {
  try {
    const matchCondition = {
      paymentStatus: PAYMENT_STATUS.PAID, // Chỉ tính giao dịch đã thanh toán
    }

    // Thêm filter theo thời gian nếu có
    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime(),
      }
    }

    const pipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: '$paymentType',
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
    ]

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Format kết quả với tên tiếng Việt
    return result.map((item) => ({
      paymentType: item._id,
      paymentTypeName: getPaymentTypeName(item._id),
      totalRevenue: item.totalRevenue || 0,
      transactionCount: item.transactionCount || 0,
      averageAmount: Math.round(item.averageAmount || 0),
    }))
  } catch (error) {
    throw new Error(`Error getting revenue by payment type: ${error.message}`)
  }
}

/**
 * ============================================
 * BIỂU ĐỒ 2: XU HƯỚNG DOANH THU THEO THỜI GIAN
 * ============================================
 */

/**
 * Lấy xu hướng doanh thu theo thời gian
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {string} groupBy - Nhóm theo: 'day', 'week', 'month'
 * @returns {Array} Xu hướng doanh thu theo thời gian
 */
const getRevenueTrend = async (startDate = null, endDate = null, groupBy = 'day') => {
  try {
    const matchCondition = {
      paymentStatus: PAYMENT_STATUS.PAID, // Chỉ tính paid
    }

    // Thêm filter theo thời gian nếu có
    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime(),
      }
    }

    const pipeline = [
      { $match: matchCondition },
      // Convert createdAt timestamp to Date
      {
        $addFields: {
          dateFromTimestamp: { $toDate: '$createdAt' },
        },
      },
    ]

    // Xác định cách group theo thời gian
    let groupId = {}
    if (groupBy === 'day') {
      groupId = {
        year: { $year: '$dateFromTimestamp' },
        month: { $month: '$dateFromTimestamp' },
        day: { $dayOfMonth: '$dateFromTimestamp' },
      }
    } else if (groupBy === 'week') {
      groupId = {
        year: { $year: '$dateFromTimestamp' },
        week: { $week: '$dateFromTimestamp' },
      }
    } else if (groupBy === 'month') {
      groupId = {
        year: { $year: '$dateFromTimestamp' },
        month: { $month: '$dateFromTimestamp' },
      }
    }

    pipeline.push(
      {
        $group: {
          _id: groupId,
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.week': 1,
          '_id.day': 1,
        },
      }
    )

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Format kết quả với label dễ đọc
    return result.map((item) => {
      let label = ''
      let sortKey = ''

      if (groupBy === 'day') {
        label = `${item._id.day}/${item._id.month}/${item._id.year}`
        sortKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`
      } else if (groupBy === 'week') {
        label = `Tuần ${item._id.week}/${item._id.year}`
        sortKey = `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`
      } else if (groupBy === 'month') {
        const monthNames = [
          'Tháng 1',
          'Tháng 2',
          'Tháng 3',
          'Tháng 4',
          'Tháng 5',
          'Tháng 6',
          'Tháng 7',
          'Tháng 8',
          'Tháng 9',
          'Tháng 10',
          'Tháng 11',
          'Tháng 12',
        ]
        label = `${monthNames[item._id.month - 1]} ${item._id.year}`
        sortKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
      }

      return {
        period: item._id,
        label: label,
        sortKey: sortKey,
        totalRevenue: item.totalRevenue || 0,
        transactionCount: item.transactionCount || 0,
        averageAmount: Math.round(item.averageAmount || 0),
      }
    })
  } catch (error) {
    throw new Error(`Error getting revenue trend: ${error.message}`)
  }
}

/**
 * ============================================
 * BIỂU ĐỒ 3: PHÂN BỐ PHƯƠNG THỨC THANH TOÁN
 * ============================================
 */

/**
 * Lấy phân bố theo phương thức thanh toán (cash, bank, momo, vnpay)
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Array} Phân bố theo phương thức thanh toán
 */
const getPaymentMethodDistribution = async (startDate = null, endDate = null) => {
  try {
    const matchCondition = {
      paymentStatus: PAYMENT_STATUS.PAID, // Chỉ tính paid
      paymentMethod: { $exists: true, $ne: null }, // Có phương thức thanh toán
    }

    // Thêm filter theo thời gian nếu có
    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime(),
      }
    }

    const pipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ]

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Tính tổng để có thể tính %
    const totalAmount = result.reduce((sum, item) => sum + item.totalAmount, 0)
    const totalCount = result.reduce((sum, item) => sum + item.transactionCount, 0)

    // Format kết quả
    return result.map((item) => ({
      paymentMethod: item._id,
      paymentMethodName: getPaymentMethodName(item._id),
      totalAmount: item.totalAmount || 0,
      transactionCount: item.transactionCount || 0,
      averageAmount: Math.round(item.averageAmount || 0),
      percentageByAmount: totalAmount > 0 ? ((item.totalAmount / totalAmount) * 100).toFixed(2) : 0,
      percentageByCount: totalCount > 0 ? ((item.transactionCount / totalCount) * 100).toFixed(2) : 0,
    }))
  } catch (error) {
    throw new Error(`Error getting payment method distribution: ${error.message}`)
  }
}

/**
 * ============================================
 * BIỂU ĐỒ 4: TRẠNG THÁI THANH TOÁN THEO THỜI GIAN
 * ============================================
 */

/**
 * Lấy số lượng giao dịch theo trạng thái và thời gian (paid, unpaid, refunded)
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {string} groupBy - Nhóm theo: 'day', 'week', 'month'
 * @returns {Array} Trạng thái thanh toán theo thời gian
 */
const getPaymentStatusOverTime = async (startDate = null, endDate = null, groupBy = 'day') => {
  try {
    const matchCondition = {}

    // Thêm filter theo thời gian nếu có
    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime(),
      }
    }

    const pipeline = [
      { $match: matchCondition },
      // Convert createdAt timestamp to Date
      {
        $addFields: {
          dateFromTimestamp: { $toDate: '$createdAt' },
        },
      },
    ]

    // Xác định cách group theo thời gian
    let groupId = {}
    if (groupBy === 'day') {
      groupId = {
        year: { $year: '$dateFromTimestamp' },
        month: { $month: '$dateFromTimestamp' },
        day: { $dayOfMonth: '$dateFromTimestamp' },
      }
    } else if (groupBy === 'week') {
      groupId = {
        year: { $year: '$dateFromTimestamp' },
        week: { $week: '$dateFromTimestamp' },
      }
    } else if (groupBy === 'month') {
      groupId = {
        year: { $year: '$dateFromTimestamp' },
        month: { $month: '$dateFromTimestamp' },
      }
    }

    pipeline.push(
      {
        $group: {
          _id: groupId,
          // Đếm từng trạng thái
          paidCount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, 1, 0],
            },
          },
          unpaidCount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.UNPAID] }, 1, 0],
            },
          },
          refundedCount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.REFUNDED] }, 1, 0],
            },
          },
          totalCount: { $sum: 1 },
          // Tính tổng tiền theo trạng thái
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, '$amount', 0],
            },
          },
          refundedAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.REFUNDED] }, '$refundAmount', 0],
            },
          },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.week': 1,
          '_id.day': 1,
        },
      }
    )

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Format kết quả
    return result.map((item) => {
      let label = ''
      let sortKey = ''

      if (groupBy === 'day') {
        label = `${item._id.day}/${item._id.month}/${item._id.year}`
        sortKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`
      } else if (groupBy === 'week') {
        label = `Tuần ${item._id.week}/${item._id.year}`
        sortKey = `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`
      } else if (groupBy === 'month') {
        const monthNames = [
          'Tháng 1',
          'Tháng 2',
          'Tháng 3',
          'Tháng 4',
          'Tháng 5',
          'Tháng 6',
          'Tháng 7',
          'Tháng 8',
          'Tháng 9',
          'Tháng 10',
          'Tháng 11',
          'Tháng 12',
        ]
        label = `${monthNames[item._id.month - 1]} ${item._id.year}`
        sortKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
      }

      return {
        period: item._id,
        label: label,
        sortKey: sortKey,
        paid: item.paidCount || 0,
        unpaid: item.unpaidCount || 0,
        refunded: item.refundedCount || 0,
        total: item.totalCount || 0,
        paidAmount: item.paidAmount || 0,
        refundedAmount: item.refundedAmount || 0,
      }
    })
  } catch (error) {
    throw new Error(`Error getting payment status over time: ${error.message}`)
  }
}

/**
 * ============================================
 * HÀM HỖ TRỢ (HELPER FUNCTIONS)
 * ============================================
 */

/**
 * Lấy tên tiếng Việt cho paymentType
 */
const getPaymentTypeName = (type) => {
  const names = {
    [PAYMENT_TYPE.MEMBERSHIP]: 'Membership',
    [PAYMENT_TYPE.BOOKING]: 'PT Booking',
    [PAYMENT_TYPE.CLASS]: 'Lớp học',
  }
  return names[type] || type
}

/**
 * Lấy tên tiếng Việt cho paymentMethod
 */
const getPaymentMethodName = (method) => {
  const names = {
    [PAYMENT_METHOD.CASH]: 'Tiền mặt',
    [PAYMENT_METHOD.BANK]: 'Chuyển khoản',
    [PAYMENT_METHOD.MOMO]: 'MoMo',
    [PAYMENT_METHOD.VNPAY]: 'VNPay',
  }
  return names[method] || method
}

/**
 * ============================================
 * THỐNG KÊ BỔ SUNG (OPTIONAL - NẾU CẦN)
 * ============================================
 */

/**
 * Lấy top khách hàng chi tiêu nhiều nhất
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {number} limit - Số lượng khách hàng (default: 10)
 * @returns {Array} Top khách hàng
 */
const getTopSpendingCustomers = async (startDate = null, endDate = null, limit = 10) => {
  try {
    const matchCondition = {
      paymentStatus: PAYMENT_STATUS.PAID,
    }

    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime(),
      }
    }

    const pipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          userId: '$_id',
          userName: '$userInfo.fullName',
          userEmail: '$userInfo.email',
          userPhone: '$userInfo.phone',
          totalSpent: 1,
          transactionCount: 1,
          averageAmount: { $round: ['$averageAmount', 0] },
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
      {
        $limit: parseInt(limit),
      },
    ]

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()
    return result
  } catch (error) {
    throw new Error(`Error getting top spending customers: ${error.message}`)
  }
}

/**
 * Lấy doanh thu theo từng tháng trong năm (cho so sánh năm)
 * @param {number} year - Năm cần thống kê
 * @returns {Array} Doanh thu theo tháng
 */
const getMonthlyRevenueByYear = async (year = new Date().getFullYear()) => {
  try {
    const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)

    const matchCondition = {
      paymentStatus: PAYMENT_STATUS.PAID,
      createdAt: {
        $gte: startOfYear.getTime(),
        $lte: endOfYear.getTime(),
      },
    }

    const pipeline = [
      { $match: matchCondition },
      {
        $addFields: {
          dateFromTimestamp: { $toDate: '$createdAt' },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$dateFromTimestamp' },
          },
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.month': 1 },
      },
    ]

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Đảm bảo có đủ 12 tháng
    const monthNames = [
      'Tháng 1',
      'Tháng 2',
      'Tháng 3',
      'Tháng 4',
      'Tháng 5',
      'Tháng 6',
      'Tháng 7',
      'Tháng 8',
      'Tháng 9',
      'Tháng 10',
      'Tháng 11',
      'Tháng 12',
    ]

    const fullYearData = monthNames.map((name, index) => {
      const monthData = result.find((item) => item._id.month === index + 1)
      return {
        month: index + 1,
        monthName: name,
        totalRevenue: monthData?.totalRevenue || 0,
        transactionCount: monthData?.transactionCount || 0,
      }
    })

    return fullYearData
  } catch (error) {
    throw new Error(`Error getting monthly revenue by year: ${error.message}`)
  }
}

// Export tất cả functions
export const paymentStatisticsModel = {
  // 4 Cards Overview
  getOverviewStats,

  // 4 Charts
  getRevenueByPaymentType,
  getRevenueTrend,
  getPaymentMethodDistribution,
  getPaymentStatusOverTime,

  // Thống kê bổ sung
  getTopSpendingCustomers,
  getMonthlyRevenueByYear,
}
