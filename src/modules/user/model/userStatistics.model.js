import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb.config.js'
import {
  USER_TYPES,
  GENDER_TYPE,
  STATUS_TYPE,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
} from '~/utils/constants.js'

// Collection names
const USER_COLLECTION_NAME = 'users'
const SUBSCRIPTION_COLLECTION_NAME = 'subscriptions'
const PAYMENT_COLLECTION_NAME = 'payments'
const ATTENDANCE_COLLECTION_NAME = 'attendances'

/**
 * 1. Tổng số hội viên
 * Đếm từ bảng Users (role = 'member' tương đương USER_TYPES.USER)
 */
const getTotalMembers = async () => {
  try {
    const totalMembers = await GET_DB().collection(USER_COLLECTION_NAME).countDocuments({
      role: USER_TYPES.USER,
      _destroy: false,
    })
    return totalMembers
  } catch (error) {
    throw new Error(`Error getting total members: ${error.message}`)
  }
}

/**
 * 2. Hội viên hoạt động
 * Users có status = 'active'
 */
const getActiveMembers = async () => {
  try {
    const activeMembers = await GET_DB().collection(USER_COLLECTION_NAME).countDocuments({
      role: USER_TYPES.USER,
      status: STATUS_TYPE.ACTIVE,
      _destroy: false,
    })
    return activeMembers
  } catch (error) {
    throw new Error(`Error getting active members: ${error.message}`)
  }
}

/**
 * 3. Hội viên mới (3 ngày gần đây)
 * Users có createdAt trong vòng 3 ngày gần nhất
 */
const getNewMembers3Days = async () => {
  try {
    // Calculate timestamp directly since createdAt is stored as JavaScript timestamp (number)
    const threeDaysAgoTimestamp = Date.now() - 3 * 24 * 60 * 60 * 1000

    const newMembers = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .countDocuments({
        role: USER_TYPES.USER,
        createdAt: { $gte: threeDaysAgoTimestamp },
        _destroy: false,
      })
    return newMembers
  } catch (error) {
    throw new Error(`Error getting new members in 3 days: ${error.message}`)
  }
}

/**
 * 4. Tổng doanh thu từ hội viên
 * Tổng Payments có paymentType = 'membership' và paymentStatus = 'paid'
 */
const getTotalRevenueFromMembers = async () => {
  try {
    const result = await GET_DB()
      .collection(PAYMENT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            paymentType: PAYMENT_TYPE.MEMBERSHIP,
            _destroy: false,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
          },
        },
      ])
      .toArray()

    return result.length > 0 ? result[0].totalRevenue : 0
  } catch (error) {
    throw new Error(`Error getting total revenue from members: ${error.message}`)
  }
}

/**
 * BIỂU ĐỒ 1: Số lượng hội viên mới theo thời gian
 * Filter: Khoảng thời gian
 */
const getNewMembersByTime = async (startDate, endDate, groupBy = 'month') => {
  try {
    let dateFormat
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d'
        break
      case 'week':
        dateFormat = '%Y-%U' // Year-Week
        break
      case 'month':
      default:
        dateFormat = '%Y-%m'
        break
    }

    // Build match condition with proper timestamp conversion
    const matchCondition = {
      role: USER_TYPES.USER,
      _destroy: false,
    }

    // Add date filter if provided - convert to timestamps
    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: new Date(startDate).getTime(),
        $lte: new Date(endDate).getTime(),
      }
    }

    const pipeline = [
      {
        $match: matchCondition,
      },
      {
        $addFields: {
          // Convert timestamp back to Date for date operations
          createdAtDate: {
            $toDate: '$createdAt',
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$createdAtDate',
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]

    const result = await GET_DB().collection(USER_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.map((item) => ({
      period: item._id,
      count: item.count,
    }))
  } catch (error) {
    throw new Error(`Error getting new members by time: ${error.message}`)
  }
}

/**
 * BIỂU ĐỒ 2: Phân bố hội viên theo giới tính
 * Filter: Khoảng thời gian (đăng ký)
 */
const getMembersByGender = async (startDate, endDate) => {
  try {
    // Build match condition with proper timestamp conversion
    const matchCondition = {
      role: USER_TYPES.USER,
      _destroy: false,
    }

    // Add date filter if provided - convert to timestamps
    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: new Date(startDate).getTime(),
        $lte: new Date(endDate).getTime(),
      }
    }

    const pipeline = [
      {
        $match: matchCondition,
      },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 },
        },
      },
    ]

    const result = await GET_DB().collection(USER_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.map((item) => ({
      gender: item._id || 'Unknown',
      count: item.count,
    }))
  } catch (error) {
    throw new Error(`Error getting members by gender: ${error.message}`)
  }
}

/**
 * BIỂU ĐỒ 3: Xu hướng check-in theo thời gian
 * Filter: Khoảng thời gian
 */
const getCheckinTrend = async (startDate, endDate, groupBy = 'day') => {
  try {
    let dateFormat
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d'
        break
      case 'week':
        dateFormat = '%Y-%U'
        break
      case 'month':
        dateFormat = '%Y-%m'
        break
      default:
        dateFormat = '%Y-%m-%d'
        break
    }

    // Build match condition
    const matchCondition = {
      _destroy: false,
      checkinTime: { $ne: '' },
    }

    // Add date filter if provided - checkinTime is ISO string, so compare as strings
    if (startDate && endDate) {
      // Convert dates to ISO strings for comparison
      const startDateISO = new Date(startDate).toISOString()
      const endDateISO = new Date(endDate).toISOString()

      matchCondition.checkinTime = {
        $gte: startDateISO,
        $lte: endDateISO,
      }
    }

    const pipeline = [
      {
        $match: matchCondition,
      },
      {
        $addFields: {
          checkinDate: {
            $dateFromString: {
              dateString: '$checkinTime',
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$checkinDate',
            },
          },
          checkinCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]

    const result = await GET_DB().collection(ATTENDANCE_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.map((item) => ({
      period: item._id,
      count: item.checkinCount,
    }))
  } catch (error) {
    throw new Error(`Error getting checkin trend: ${error.message}`)
  }
}

/**
 * BIỂU ĐỒ 4: Phân bố độ tuổi hội viên
 * Filter: Khoảng thời gian (đăng ký)
 */
const getMembersByAge = async (startDate, endDate) => {
  try {
    // Build match condition with proper timestamp conversion
    const matchCondition = {
      role: USER_TYPES.USER,
      _destroy: false,
      age: { $ne: null, $gte: 1 },
    }

    // Add date filter if provided - convert to timestamps
    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: new Date(startDate).getTime(),
        $lte: new Date(endDate).getTime(),
      }
    }

    const pipeline = [
      {
        $match: matchCondition,
      },
      {
        $addFields: {
          ageGroup: {
            $switch: {
              branches: [
                { case: { $and: [{ $gte: ['$age', 18] }, { $lte: ['$age', 25] }] }, then: '18-25' },
                { case: { $and: [{ $gte: ['$age', 26] }, { $lte: ['$age', 35] }] }, then: '26-35' },
                { case: { $and: [{ $gte: ['$age', 36] }, { $lte: ['$age', 45] }] }, then: '36-45' },
                { case: { $and: [{ $gte: ['$age', 46] }, { $lte: ['$age', 55] }] }, then: '46-55' },
                { case: { $gte: ['$age', 56] }, then: '55+' },
              ],
              default: 'Unknown',
            },
          },
        },
      },
      {
        $group: {
          _id: '$ageGroup',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]

    const result = await GET_DB().collection(USER_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.map((item) => ({
      ageGroup: item._id,
      count: item.count,
    }))
  } catch (error) {
    throw new Error(`Error getting members by age: ${error.message}`)
  }
}

/**
 * Hàm tổng hợp lấy tất cả thống kê tổng quan
 */
const getOverviewStats = async () => {
  try {
    const [totalMembers, activeMembers, newMembers3Days, totalRevenue] = await Promise.all([
      getTotalMembers(),
      getActiveMembers(),
      getNewMembers3Days(),
      getTotalRevenueFromMembers(),
    ])

    return {
      totalMembers,
      activeMembers,
      newMembers3Days,
      totalRevenue,
    }
  } catch (error) {
    throw new Error(`Error getting overview stats: ${error.message}`)
  }
}

/**
 * Hàm tổng hợp lấy tất cả biểu đồ với filter thời gian
 */
const getAllChartsData = async (startDate, endDate, timeGroupBy = 'month') => {
  try {
    const [newMembersByTime, membersByGender, checkinTrend, membersByAge] = await Promise.all([
      getNewMembersByTime(startDate, endDate, timeGroupBy),
      getMembersByGender(startDate, endDate),
      getCheckinTrend(startDate, endDate, timeGroupBy),
      getMembersByAge(startDate, endDate),
    ])

    return {
      newMembersByTime,
      membersByGender,
      checkinTrend,
      membersByAge,
    }
  } catch (error) {
    throw new Error(`Error getting all charts data: ${error.message}`)
  }
}

export const userStatisticsModel = {
  // Overview Stats
  getTotalMembers,
  getActiveMembers,
  getNewMembers3Days,
  getTotalRevenueFromMembers,
  getOverviewStats,

  // Charts Data
  getNewMembersByTime,
  getMembersByGender,
  getCheckinTrend,
  getMembersByAge,
  getAllChartsData,
}
