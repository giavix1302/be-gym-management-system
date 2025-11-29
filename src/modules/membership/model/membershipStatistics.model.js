/* eslint-disable indent */
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb.config.js'
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '~/utils/constants.js'

// Collection names
const PAYMENT_COLLECTION_NAME = 'payments'
const SUBSCRIPTION_COLLECTION_NAME = 'subscriptions'
const MEMBERSHIP_COLLECTION_NAME = 'memberships'

// =================================================================================
// OVERVIEW CARDS FUNCTIONS
// =================================================================================

/**
 * Tính tổng doanh thu membership trong khoảng thời gian
 * @param {string} startDate - ISO Date string
 * @param {string} endDate - ISO Date string
 * @returns {number} Tổng doanh thu
 */
const getTotalMembershipRevenue = async (startDate = null, endDate = null) => {
  try {
    const matchConditions = {
      paymentType: 'membership',
      _destroy: false,
    }

    // Thêm filter thời gian nếu có
    if (startDate && endDate) {
      matchConditions.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    console.log('🔍 getTotalMembershipRevenue matchConditions:', matchConditions)

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
        },
      },
    ]

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()
    console.log('🔍 getTotalMembershipRevenue result:', result)

    const revenue = result.length > 0 ? result[0].totalRevenue : 0
    console.log('🔍 getTotalMembershipRevenue final revenue:', revenue)

    return revenue
  } catch (error) {
    console.error('❌ getTotalMembershipRevenue error:', error)
    throw new Error(`Error getting total membership revenue: ${error.message}`)
  }
}

/**
 * Đếm tổng số người có subscription (thay cho membership mới)
 * @param {string} startDate - ISO Date string
 * @param {string} endDate - ISO Date string
 * @returns {number} Số người có subscription
 */
const getTotalActiveSubscriptions = async (startDate = null, endDate = null) => {
  try {
    let matchConditions = {
      status: 'active', // Sử dụng string vì constant = 'active'
      _destroy: false,
    }

    // Thêm filter thời gian nếu có
    if (startDate && endDate) {
      matchConditions.startDate = {
        $gte: startDate,
        $lte: endDate,
      }
    }

    const count = await GET_DB().collection(SUBSCRIPTION_COLLECTION_NAME).countDocuments(matchConditions)
    return count
  } catch (error) {
    throw new Error(`Error getting total active subscriptions: ${error.message}`)
  }
}

/**
 * Đếm tổng số gói membership có sẵn (không bị destroy)
 * @returns {number} Số lượng membership packages
 */
const getTotalActiveMemberships = async () => {
  try {
    const count = await GET_DB().collection(MEMBERSHIP_COLLECTION_NAME).countDocuments({
      _destroy: false,
    })
    return count
  } catch (error) {
    throw new Error(`Error getting total memberships: ${error.message}`)
  }
}

/**
 * Đếm số subscription mới trong khoảng thời gian (mặc định là tháng hiện tại)
 * @param {string} startDate - ISO Date string
 * @param {string} endDate - ISO Date string
 * @returns {number} Số subscription mới
 */
const getNewSubscriptionsThisMonth = async (startDate = null, endDate = null) => {
  try {
    let dateFilter = {}

    if (startDate && endDate) {
      dateFilter = {
        startDate: {
          $gte: startDate,
          $lte: endDate,
        },
      }
    } else {
      // Mặc định là tháng hiện tại
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

      dateFilter = {
        startDate: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      }
    }

    const count = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .countDocuments({
        ...dateFilter,
        _destroy: false,
      })
    return count
  } catch (error) {
    throw new Error(`Error getting new subscriptions: ${error.message}`)
  }
}

/**
 * Đếm số người không có gói tập hoặc gói tập đã hết hạn
 * @param {string} startDate - ISO Date string
 * @param {string} endDate - ISO Date string
 * @returns {number} Số người không có gói tập active
 */
const getInactiveUsersCount = async (startDate = null, endDate = null) => {
  try {
    // Lấy tất cả users role='user'
    const allUserIds = await GET_DB()
      .collection('users')
      .find(
        {
          _destroy: false,
          role: 'user',
        },
        {
          projection: { _id: 1 },
        }
      )
      .toArray()

    const totalUsers = allUserIds.length
    console.log('🔍 getInactiveUsersCount - totalUsers:', totalUsers)

    // Lấy danh sách userIds có subscription active - dùng aggregate thay vì distinct
    const activeUsersResult = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            status: 'active',
            _destroy: false,
          },
        },
        {
          $group: {
            _id: '$userId', // Group by userId để get distinct
          },
        },
      ])
      .toArray()

    const activeUserIds = activeUsersResult.map((item) => item._id)
    console.log('🔍 getInactiveUsersCount - activeUserIds count:', activeUserIds.length)

    // Tìm users role='user' KHÔNG có trong danh sách activeUserIds
    const allUserObjectIds = allUserIds.map((user) => user._id.toString())
    const activeUserStringIds = activeUserIds.map((id) => id.toString())

    const inactiveUserIds = allUserObjectIds.filter((userId) => !activeUserStringIds.includes(userId))

    const inactiveUsers = inactiveUserIds.length

    console.log('🔍 getInactiveUsersCount - allUserObjectIds:', allUserObjectIds)
    console.log('🔍 getInactiveUsersCount - activeUserStringIds:', activeUserStringIds)
    console.log('🔍 getInactiveUsersCount - inactiveUserIds:', inactiveUserIds)
    console.log('🔍 getInactiveUsersCount - inactiveUsers:', inactiveUsers)

    return Math.max(0, inactiveUsers)
  } catch (error) {
    console.error('❌ getInactiveUsersCount error:', error)
    throw new Error(`Error getting inactive users count: ${error.message}`)
  }
}

// =================================================================================
// CHART FUNCTIONS
// =================================================================================

/**
 * Lấy doanh thu membership theo thời gian cho biểu đồ cột
 * @param {string} startDate - ISO Date string
 * @param {string} endDate - ISO Date string
 * @param {string} groupBy - 'day', 'week', 'month'
 * @returns {Array} Mảng dữ liệu [{period, revenue}]
 */
const getMembershipRevenueByTime = async (startDate, endDate, groupBy = 'day') => {
  try {
    console.log('🔍 getMembershipRevenueByTime input:', { startDate, endDate, groupBy })

    let groupFormat
    let sortField

    switch (groupBy) {
      case 'day':
        groupFormat = {
          year: { $year: { $dateFromString: { dateString: '$paymentDate' } } },
          month: { $month: { $dateFromString: { dateString: '$paymentDate' } } },
          day: { $dayOfMonth: { $dateFromString: { dateString: '$paymentDate' } } },
        }
        sortField = { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        break
      case 'week':
        groupFormat = {
          year: { $year: { $dateFromString: { dateString: '$paymentDate' } } },
          week: { $week: { $dateFromString: { dateString: '$paymentDate' } } },
        }
        sortField = { '_id.year': 1, '_id.week': 1 }
        break
      case 'month':
        groupFormat = {
          year: { $year: { $dateFromString: { dateString: '$paymentDate' } } },
          month: { $month: { $dateFromString: { dateString: '$paymentDate' } } },
        }
        sortField = { '_id.year': 1, '_id.month': 1 }
        break
      default:
        groupFormat = {
          year: { $year: { $dateFromString: { dateString: '$paymentDate' } } },
          month: { $month: { $dateFromString: { dateString: '$paymentDate' } } },
          day: { $dayOfMonth: { $dateFromString: { dateString: '$paymentDate' } } },
        }
        sortField = { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }

    console.log('🔍 getMembershipRevenueByTime input:', { startDate, endDate, groupBy })

    const matchConditions = {
      paymentType: 'membership',
      _destroy: false,
      paymentDate: {
        $gte: startDate, // Restore real dates
        $lte: endDate, // Restore real dates
      },
    }

    console.log('🔍 getMembershipRevenueByTime matchConditions:', matchConditions)

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: sortField },
    ]

    const results = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()
    console.log('🔍 getMembershipRevenueByTime results:', results)

    // Format kết quả
    const formattedResults = results.map((item) => {
      let period
      switch (groupBy) {
        case 'day':
          period = `${item._id.day}/${item._id.month}/${item._id.year}`
          break
        case 'week':
          period = `Tuần ${item._id.week}/${item._id.year}`
          break
        case 'month':
          period = `${item._id.month}/${item._id.year}`
          break
        default:
          period = `${item._id.day}/${item._id.month}/${item._id.year}`
      }

      return {
        period,
        revenue: item.revenue,
        count: item.count,
      }
    })

    console.log('🔍 getMembershipRevenueByTime formatted:', formattedResults)
    return formattedResults
  } catch (error) {
    console.error('❌ getMembershipRevenueByTime error:', error)
    throw new Error(`Error getting membership revenue by time: ${error.message}`)
  }
}

/**
 * Lấy xu hướng đăng ký membership cho biểu đồ đường
 * @param {string} startDate - ISO Date string
 * @param {string} endDate - ISO Date string
 * @param {string} groupBy - 'day', 'week', 'month'
 * @returns {Array} Mảng dữ liệu [{period, newSubscriptions, expiredSubscriptions}]
 */
const getMembershipTrendsByTime = async (startDate, endDate, groupBy = 'day') => {
  try {
    let groupFormat
    let sortField

    switch (groupBy) {
      case 'day':
        groupFormat = {
          year: { $year: { $dateFromString: { dateString: '$startDate' } } },
          month: { $month: { $dateFromString: { dateString: '$startDate' } } },
          day: { $dayOfMonth: { $dateFromString: { dateString: '$startDate' } } },
        }
        sortField = { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        break
      case 'week':
        groupFormat = {
          year: { $year: { $dateFromString: { dateString: '$startDate' } } },
          week: { $week: { $dateFromString: { dateString: '$startDate' } } },
        }
        sortField = { '_id.year': 1, '_id.week': 1 }
        break
      case 'month':
        groupFormat = {
          year: { $year: { $dateFromString: { dateString: '$startDate' } } },
          month: { $month: { $dateFromString: { dateString: '$startDate' } } },
        }
        sortField = { '_id.year': 1, '_id.month': 1 }
        break
      default:
        groupFormat = {
          year: { $year: { $dateFromString: { dateString: '$startDate' } } },
          month: { $month: { $dateFromString: { dateString: '$startDate' } } },
          day: { $dayOfMonth: { $dateFromString: { dateString: '$startDate' } } },
        }
        sortField = { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }

    // Chỉ lấy new subscriptions vì chưa có expired data
    const newSubscriptionsPipeline = [
      {
        $match: {
          startDate: {
            $gte: startDate,
            $lte: endDate,
          },
          _destroy: false,
        },
      },
      {
        $group: {
          _id: groupFormat,
          newSubscriptions: { $sum: 1 },
        },
      },
      { $sort: sortField },
    ]

    const newResults = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .aggregate(newSubscriptionsPipeline)
      .toArray()

    console.log('🔍 getMembershipTrendsByTime newResults:', newResults)

    // Format kết quả
    return newResults.map((item) => {
      let period
      switch (groupBy) {
        case 'day':
          period = `${item._id.day}/${item._id.month}/${item._id.year}`
          break
        case 'week':
          period = `Tuần ${item._id.week}/${item._id.year}`
          break
        case 'month':
          period = `${item._id.month}/${item._id.year}`
          break
        default:
          period = `${item._id.day}/${item._id.month}/${item._id.year}`
      }

      return {
        period,
        newSubscriptions: item.newSubscriptions,
        expiredSubscriptions: 0, // Set 0 vì chưa có expired data
      }
    })
  } catch (error) {
    console.error('❌ getMembershipTrendsByTime error:', error)
    throw new Error(`Error getting membership trends by time: ${error.message}`)
  }
}

// =================================================================================
// EXPORT MODEL
// =================================================================================

export const membershipStatisticsModel = {
  // Overview cards
  getTotalMembershipRevenue,
  getTotalActiveMemberships, // Số gói membership có sẵn
  getTotalActiveSubscriptions, // Số người có subscription
  getNewSubscriptionsThisMonth, // Subscription mới
  getInactiveUsersCount, // Số người không có gói tập

  // Charts
  getMembershipRevenueByTime,
  getMembershipTrendsByTime,
}
