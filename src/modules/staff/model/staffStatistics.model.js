import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb.config.js'
import { USER_TYPES, STAFF_TYPE } from '~/utils/constants.js'

const STAFF_COLLECTION_NAME = 'staffs'
const STAFF_SHIFT_COLLECTION_NAME = 'staff_shifts' // Theo document chính thức
const USERS_COLLECTION_NAME = 'users'
const LOCATIONS_COLLECTION_NAME = 'locations'

/**
 * Lấy tổng số nhân viên
 * @returns {number} Tổng số nhân viên
 */
const getTotalStaff = async () => {
  try {
    const totalStaff = await GET_DB()
      .collection(STAFF_COLLECTION_NAME)
      .countDocuments({ _destroy: { $ne: true } })

    return totalStaff
  } catch (error) {
    throw new Error(`Error getting total staff: ${error.message}`)
  }
}

/**
 * Lấy số nhân viên có mặt hôm nay
 * @param {Date} startDate - Ngày bắt đầu (start of day)
 * @param {Date} endDate - Ngày kết thúc (end of day)
 * @returns {number} Số nhân viên có mặt
 */
const getStaffPresentToday = async (startDate = null, endDate = null) => {
  try {
    // Nếu không có date params, tự động set cho hôm nay
    if (!startDate || !endDate) {
      const today = new Date()
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
    }

    // Tạo aggregation pipeline
    const pipeline = [
      {
        $match: {
          checkinTime: { $exists: true, $ne: null, $ne: '' },
          _destroy: { $ne: true },
          // Filter theo thời gian (luôn áp dụng cho "today")
          createdAt: {
            $gte: startDate.getTime(),
            $lte: endDate.getTime(),
          },
        },
      },
    ]

    console.log('🚀 Staff Present Today filter:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startTimestamp: startDate.getTime(),
      endTimestamp: endDate.getTime(),
    })

    // Đếm số nhân viên unique
    pipeline.push({
      $group: {
        _id: '$staffId',
      },
    })

    pipeline.push({
      $count: 'totalPresent',
    })

    const result = await GET_DB().collection(STAFF_SHIFT_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.length > 0 ? result[0].totalPresent : 0
  } catch (error) {
    throw new Error(`Error getting staff present today: ${error.message}`)
  }
}

/**
 * Lấy tổng giờ làm việc trong khoảng thời gian
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {number} Tổng giờ làm việc
 */
const getTotalWorkingHours = async (startDate = null, endDate = null) => {
  try {
    const pipeline = [
      {
        $match: {
          hours: { $exists: true, $gt: 0 },
          _destroy: { $ne: true },
        },
      },
    ]

    // Thêm filter theo thời gian nếu có (sử dụng createdAt timestamp)
    if (startDate && endDate) {
      pipeline[0].$match.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime(),
      }
    }

    // Tính tổng giờ
    pipeline.push({
      $group: {
        _id: null,
        totalHours: { $sum: '$hours' },
      },
    })

    const result = await GET_DB().collection(STAFF_SHIFT_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.length > 0 ? result[0].totalHours : 0
  } catch (error) {
    throw new Error(`Error getting total working hours: ${error.message}`)
  }
}

/**
 * Lấy tổng chi phí lương trong khoảng thời gian
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {number} Tổng chi phí lương
 */
const getTotalSalaryCost = async (startDate = null, endDate = null) => {
  try {
    const pipeline = [
      {
        $match: {
          hours: { $exists: true, $gt: 0 },
          _destroy: { $ne: true },
        },
      },
    ]

    // Thêm filter theo thời gian nếu có (sử dụng createdAt timestamp)
    if (startDate && endDate) {
      pipeline[0].$match.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime(),
      }
    }

    // Join với Staff để lấy hourlyRate
    pipeline.push({
      $lookup: {
        from: STAFF_COLLECTION_NAME,
        localField: 'staffId',
        foreignField: '_id',
        as: 'staffInfo',
      },
    })

    pipeline.push({
      $unwind: '$staffInfo',
    })

    // Tính tổng chi phí (hours * hourlyRate)
    pipeline.push({
      $group: {
        _id: null,
        totalCost: {
          $sum: {
            $multiply: ['$hours', '$staffInfo.hourlyRate'],
          },
        },
      },
    })

    const result = await GET_DB().collection(STAFF_SHIFT_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.length > 0 ? result[0].totalCost : 0
  } catch (error) {
    throw new Error(`Error getting total salary cost: ${error.message}`)
  }
}

/**
 * Lấy số giờ làm việc theo từng nhân viên
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {number} limit - Số lượng nhân viên trả về (default: 10)
 * @returns {Array} Danh sách nhân viên và số giờ làm việc
 */
const getWorkingHoursByStaff = async (startDate = null, endDate = null, limit = 10) => {
  try {
    console.log('🚀 getWorkingHoursByStaff params:', { startDate, endDate, limit })

    const pipeline = [
      {
        $match: {
          hours: { $exists: true, $gt: 0 },
          _destroy: { $ne: true },
        },
      },
    ]

    // Thêm filter theo thời gian nếu có (sử dụng createdAt timestamp)
    // TEMPORARY: Comment out for testing - should show both staff
    /*
    if (startDate && endDate) {
      pipeline[0].$match.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime()
      }
      console.log('🚀 Date filter applied:', {
        startTimestamp: startDate.getTime(),
        endTimestamp: endDate.getTime()
      })
    } else {
      console.log('🚀 No date filter applied')
    }
    */
    console.log('🚀 Date filter DISABLED for testing')

    console.log('🚀 Initial match stage:', JSON.stringify(pipeline[0], null, 2))

    // Join với Staff để lấy thông tin nhân viên
    pipeline.push({
      $lookup: {
        from: STAFF_COLLECTION_NAME,
        localField: 'staffId',
        foreignField: '_id',
        as: 'staffInfo',
      },
    })

    pipeline.push({
      $unwind: {
        path: '$staffInfo',
        preserveNullAndEmptyArrays: true,
      },
    })

    // Join với Users để lấy thông tin user
    pipeline.push({
      $lookup: {
        from: USERS_COLLECTION_NAME,
        localField: 'staffInfo.userId',
        foreignField: '_id',
        as: 'userInfo',
      },
    })

    pipeline.push({
      $unwind: {
        path: '$userInfo',
        preserveNullAndEmptyArrays: true,
      },
    })

    // Group theo staffId và tính tổng giờ
    pipeline.push({
      $group: {
        _id: '$staffId',
        totalHours: { $sum: '$hours' },
        staffName: {
          $first: {
            $ifNull: ['$userInfo.fullName', 'Unknown Staff'],
          },
        },
        hourlyRate: { $first: '$staffInfo.hourlyRate' },
        locationId: { $first: '$staffInfo.locationId' },
      },
    })

    // Sắp xếp theo số giờ giảm dần
    pipeline.push({
      $sort: { totalHours: -1 },
    })

    // Limit kết quả
    pipeline.push({
      $limit: parseInt(limit),
    })

    console.log('🚀 Full pipeline:', JSON.stringify(pipeline, null, 2))

    const result = await GET_DB().collection(STAFF_SHIFT_COLLECTION_NAME).aggregate(pipeline).toArray()

    console.log('🚀 getWorkingHoursByStaff result:', result)
    return result
  } catch (error) {
    console.error('❌ getWorkingHoursByStaff error:', error)
    throw new Error(`Error getting working hours by staff: ${error.message}`)
  }
}

/**
 * Lấy xu hướng check-in theo thời gian
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {string} groupBy - Nhóm theo: 'day', 'week', 'month'
 * @returns {Array} Xu hướng check-in theo thời gian
 */
const getCheckinTrend = async (startDate = null, endDate = null, groupBy = 'day') => {
  try {
    const pipeline = [
      {
        $match: {
          checkinTime: { $exists: true, $ne: null, $ne: '' },
          _destroy: { $ne: true },
        },
      },
    ]

    // TEMPORARY: Comment out date filtering for testing
    /*
    if (startDate && endDate) {
      pipeline[0].$match.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime()
      }
    }
    */

    // Convert createdAt timestamp to Date cho grouping
    pipeline.push({
      $addFields: {
        dateFromTimestamp: { $toDate: '$createdAt' },
      },
    })

    // Group theo thời gian
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

    pipeline.push({
      $group: {
        _id: groupId,
        checkinCount: { $sum: 1 },
      },
    })

    // Tạo period field và sắp xếp
    pipeline.push({
      $addFields: {
        period: '$_id',
      },
    })

    pipeline.push({
      $sort: {
        '_id.year': 1,
        '_id.month': 1,
        '_id.week': 1,
        '_id.day': 1,
      },
    })

    const result = await GET_DB().collection(STAFF_SHIFT_COLLECTION_NAME).aggregate(pipeline).toArray()

    console.log('🚀 getCheckinTrend result:', result)
    return result
  } catch (error) {
    throw new Error(`Error getting checkin trend: ${error.message}`)
  }
}

/**
 * Lấy top nhân viên làm việc nhiều nhất
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {number} limit - Số lượng nhân viên trả về (default: 10)
 * @returns {Array} Top nhân viên làm việc nhiều nhất
 */
const getTopWorkingStaff = async (startDate = null, endDate = null, limit = 10) => {
  try {
    const pipeline = [
      {
        $match: {
          hours: { $exists: true, $gt: 0 },
          _destroy: { $ne: true },
        },
      },
    ]

    // Thêm filter theo thời gian nếu có (sử dụng createdAt timestamp)
    // TEMPORARY: Commented out for testing
    /*
    if (startDate && endDate) {
      pipeline[0].$match.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime()
      }
    }
    */

    // Join với Staff để lấy thông tin nhân viên
    pipeline.push({
      $lookup: {
        from: STAFF_COLLECTION_NAME,
        localField: 'staffId',
        foreignField: '_id',
        as: 'staffInfo',
      },
    })

    pipeline.push({
      $unwind: {
        path: '$staffInfo',
        preserveNullAndEmptyArrays: true,
      },
    })

    // Join với Users để lấy thông tin user
    pipeline.push({
      $lookup: {
        from: USERS_COLLECTION_NAME,
        localField: 'staffInfo.userId',
        foreignField: '_id',
        as: 'userInfo',
      },
    })

    pipeline.push({
      $unwind: {
        path: '$userInfo',
        preserveNullAndEmptyArrays: true,
      },
    })

    // Group theo staffId
    pipeline.push({
      $group: {
        _id: '$staffId',
        totalHours: { $sum: '$hours' },
        staffName: {
          $first: {
            $ifNull: ['$userInfo.fullName', 'Unknown Staff'],
          },
        },
        hourlyRate: { $first: '$staffInfo.hourlyRate' },
        totalSalaryCost: {
          $sum: {
            $multiply: ['$hours', '$staffInfo.hourlyRate'],
          },
        },
      },
    })

    // Sắp xếp theo số giờ giảm dần và limit
    pipeline.push({
      $sort: { totalHours: -1 },
    })

    pipeline.push({
      $limit: parseInt(limit),
    })

    const result = await GET_DB().collection(STAFF_SHIFT_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result
  } catch (error) {
    throw new Error(`Error getting top working staff: ${error.message}`)
  }
}

/**
 * Lấy chi phí lương theo location
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Array} Chi phí lương theo location
 */
const getSalaryCostByLocation = async (startDate = null, endDate = null) => {
  try {
    const pipeline = [
      {
        $match: {
          hours: { $exists: true, $gt: 0 },
          _destroy: { $ne: true },
        },
      },
    ]

    // Thêm filter theo thời gian nếu có (sử dụng createdAt timestamp)
    // TEMPORARY: Comment for testing
    /*
    if (startDate && endDate) {
      pipeline[0].$match.createdAt = {
        $gte: startDate.getTime(),
        $lte: endDate.getTime()
      }
    }
    */

    // Join với Staff để lấy thông tin nhân viên
    pipeline.push({
      $lookup: {
        from: STAFF_COLLECTION_NAME,
        localField: 'staffId',
        foreignField: '_id',
        as: 'staffInfo',
      },
    })

    pipeline.push({
      $unwind: '$staffInfo',
    })

    // Join với Locations để lấy tên location
    pipeline.push({
      $lookup: {
        from: LOCATIONS_COLLECTION_NAME,
        localField: 'staffInfo.locationId',
        foreignField: '_id',
        as: 'locationInfo',
      },
    })

    pipeline.push({
      $unwind: '$locationInfo',
    })

    // Group theo locationId
    pipeline.push({
      $group: {
        _id: '$staffInfo.locationId',
        locationName: { $first: '$locationInfo.name' },
        totalCost: {
          $sum: {
            $multiply: ['$hours', '$staffInfo.hourlyRate'],
          },
        },
        totalHours: { $sum: '$hours' },
        staffCount: { $addToSet: '$staffId' },
      },
    })

    // Thêm count của unique staff
    pipeline.push({
      $addFields: {
        staffCount: { $size: '$staffCount' },
      },
    })

    // Sắp xếp theo chi phí giảm dần
    pipeline.push({
      $sort: { totalCost: -1 },
    })

    const result = await GET_DB().collection(STAFF_SHIFT_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result
  } catch (error) {
    throw new Error(`Error getting salary cost by location: ${error.message}`)
  }
}

// Export tất cả functions
export const staffStatisticsModel = {
  getTotalStaff,
  getStaffPresentToday,
  getTotalWorkingHours,
  getTotalSalaryCost,
  getWorkingHoursByStaff,
  getCheckinTrend,
  getTopWorkingStaff,
  getSalaryCostByLocation,
}
