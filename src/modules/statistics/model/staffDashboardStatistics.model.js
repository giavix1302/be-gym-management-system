import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb.config.js'
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  EQUIPMENT_STATUS,
  CLASS_ENROLLMENT_STATUS,
  APPROVED_TYPE,
} from '~/utils/constants.js'

// Collection names
const ATTENDANCE_COLLECTION_NAME = 'attendances'
const PAYMENT_COLLECTION_NAME = 'payments'
const TRAINER_COLLECTION_NAME = 'trainers'
const USER_COLLECTION_NAME = 'users'
const CLASS_COLLECTION_NAME = 'classes'
const EQUIPMENT_COLLECTION_NAME = 'equipments'
const CLASS_ENROLLMENT_COLLECTION_NAME = 'classenrollments'
const BOOKING_COLLECTION_NAME = 'bookings'
const SCHEDULE_COLLECTION_NAME = 'schedules'
const CLASS_SESSION_COLLECTION_NAME = 'classsessions'
const ROOM_COLLECTION_NAME = 'rooms'
const REVIEW_COLLECTION_NAME = 'reviews'

/**
 * ============================================
 * OVERVIEW CARDS
 * ============================================
 */

/**
 * 1. Lượt Check-in Hôm Nay
 * Đếm số attendances trong ngày tại cơ sở
 */
const getTodayCheckins = async (locationId) => {
  try {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

    const count = await GET_DB()
      .collection(ATTENDANCE_COLLECTION_NAME)
      .countDocuments({
        locationId: new ObjectId(locationId),
        checkinTime: { $gte: startOfDay, $lte: endOfDay },
        _destroy: false,
      })

    return count
  } catch (error) {
    throw new Error(`Error getting today checkins: ${error.message}`)
  }
}

/**
 * 2. Doanh Thu Cơ Sở (Tháng hiện tại)
 * Tổng payments liên quan đến cơ sở trong tháng hiện tại
 */
const getMonthlyRevenue = async (locationId) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

    // Lấy tất cả bookings của location
    const bookings = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .find({
        locationId: new ObjectId(locationId),
        _destroy: false,
      })
      .project({ _id: 1 })
      .toArray()

    const bookingIds = bookings.map((b) => b._id)

    // Lấy tất cả classes của location
    const classes = await GET_DB()
      .collection(CLASS_COLLECTION_NAME)
      .find({
        locationId: new ObjectId(locationId),
        _destroy: false,
      })
      .project({ _id: 1 })
      .toArray()

    const classIds = classes.map((c) => c._id)

    // Tính tổng doanh thu từ payments
    const result = await GET_DB()
      .collection(PAYMENT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            paymentDate: { $gte: startOfMonth, $lte: endOfMonth },
            paymentStatus: PAYMENT_STATUS.PAID,
            _destroy: false,
            $or: [
              { paymentType: PAYMENT_TYPE.BOOKING, referenceId: { $in: bookingIds } },
              { paymentType: PAYMENT_TYPE.CLASS, referenceId: { $in: classIds } },
            ],
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
    throw new Error(`Error getting monthly revenue: ${error.message}`)
  }
}

/**
 * 3. Tổng Số Thiết Bị
 * Đếm tất cả thiết bị tại cơ sở
 */
const getTotalEquipments = async (locationId) => {
  try {
    const count = await GET_DB()
      .collection(EQUIPMENT_COLLECTION_NAME)
      .countDocuments({
        locationId: new ObjectId(locationId),
        _destroy: false,
      })

    return count
  } catch (error) {
    throw new Error(`Error getting total equipments: ${error.message}`)
  }
}

/**
 * 4. Lớp Học Đang Hoạt Động
 * Classes có startDate <= now <= endDate
 */
const getActiveClasses = async (locationId) => {
  try {
    const now = new Date().toISOString()

    const count = await GET_DB()
      .collection(CLASS_COLLECTION_NAME)
      .countDocuments({
        locationId: new ObjectId(locationId),
        startDate: { $lte: now },
        endDate: { $gte: now },
        _destroy: false,
      })

    return count
  } catch (error) {
    throw new Error(`Error getting active classes: ${error.message}`)
  }
}

/**
 * Tổng hợp Overview Stats
 */
const getOverviewStats = async (locationId) => {
  try {
    const [todayCheckins, totalRevenue, totalEquipments, activeClasses] = await Promise.all([
      getTodayCheckins(locationId),
      getMonthlyRevenue(locationId),
      getTotalEquipments(locationId),
      getActiveClasses(locationId),
    ])

    return {
      todayCheckins,
      totalRevenue,
      totalEquipments,
      activeClasses,
    }
  } catch (error) {
    throw new Error(`Error getting overview stats: ${error.message}`)
  }
}

/**
 * ============================================
 * BIỂU ĐỒ CHECK-IN 7 NGÀY
 * ============================================
 */
const getCheckinChart7Days = async (locationId) => {
  try {
    const now = new Date()

    // Calculate start date (6 days ago at 00:00:00 UTC)
    const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0))

    // Calculate end date (today at 23:59:59 UTC)
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))

    const startDate = sevenDaysAgo.toISOString()
    const endDate = endOfToday.toISOString()

    const pipeline = [
      {
        $match: {
          locationId: new ObjectId(locationId),
          checkinTime: { $gte: startDate, $lte: endDate },
          _destroy: false,
        },
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
              format: '%Y-%m-%d',
              date: '$checkinDate',
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]

    const result = await GET_DB().collection(ATTENDANCE_COLLECTION_NAME).aggregate(pipeline).toArray()
    // Map days of week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Create a map of all 7 days with 0 counts
    const chartData = []

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(
        Date.UTC(sevenDaysAgo.getUTCFullYear(), sevenDaysAgo.getUTCMonth(), sevenDaysAgo.getUTCDate() + i, 0, 0, 0, 0)
      )
      const dateStr = currentDate.toISOString().split('T')[0]
      const dayName = dayNames[currentDate.getUTCDay()]

      const existingData = result.find((item) => item._id === dateStr)

      chartData.push({
        day: dayName,
        date: dateStr,
        count: existingData ? existingData.count : 0,
      })
    }

    return chartData
  } catch (error) {
    throw new Error(`Error getting checkin chart: ${error.message}`)
  }
}

/**
 * ============================================
 * TÌNH TRẠNG THIẾT BỊ
 * ============================================
 */
const getEquipmentStatus = async (locationId) => {
  try {
    const pipeline = [
      {
        $match: {
          locationId: new ObjectId(locationId),
          _destroy: false,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]

    const result = await GET_DB().collection(EQUIPMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    const statusMap = {
      [EQUIPMENT_STATUS.ACTIVE]: 0,
      [EQUIPMENT_STATUS.MAINTENANCE]: 0,
      [EQUIPMENT_STATUS.BROKEN]: 0,
    }

    result.forEach((item) => {
      if (statusMap.hasOwnProperty(item._id)) {
        statusMap[item._id] = item.count
      }
    })

    return {
      active: statusMap[EQUIPMENT_STATUS.ACTIVE],
      maintenance: statusMap[EQUIPMENT_STATUS.MAINTENANCE],
      broken: statusMap[EQUIPMENT_STATUS.BROKEN],
    }
  } catch (error) {
    throw new Error(`Error getting equipment status: ${error.message}`)
  }
}

/**
 * ============================================
 * CẢNH BÁO HỆ THỐNG
 * ============================================
 */

/**
 * 1. Thiết Bị Cần Bảo Trì
 * Đếm equipments có status='maintenance' hoặc 'broken'
 */
const getEquipmentIssues = async (locationId) => {
  try {
    const count = await GET_DB()
      .collection(EQUIPMENT_COLLECTION_NAME)
      .countDocuments({
        locationId: new ObjectId(locationId),
        status: { $in: [EQUIPMENT_STATUS.MAINTENANCE, EQUIPMENT_STATUS.BROKEN] },
        _destroy: false,
      })

    return count
  } catch (error) {
    throw new Error(`Error getting equipment issues: ${error.message}`)
  }
}

/**
 * 2. Lớp Học Ít Người
 * Classes có số user đăng ký < 5
 */
const getLowEnrollmentClasses = async (locationId) => {
  try {
    // Lấy tất cả classes của location
    const classes = await GET_DB()
      .collection(CLASS_COLLECTION_NAME)
      .find({
        locationId: new ObjectId(locationId),
        _destroy: false,
      })
      .project({ _id: 1 })
      .toArray()

    const classIds = classes.map((c) => c._id)

    // Đếm enrollment cho mỗi class
    const pipeline = [
      {
        $match: {
          classId: { $in: classIds },
          status: CLASS_ENROLLMENT_STATUS.ACTIVE,
          _destroy: false,
        },
      },
      {
        $group: {
          _id: '$classId',
          enrollmentCount: { $sum: 1 },
        },
      },
      {
        $match: {
          enrollmentCount: { $lt: 5 },
        },
      },
    ]

    const result = await GET_DB().collection(CLASS_ENROLLMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.length
  } catch (error) {
    throw new Error(`Error getting low enrollment classes: ${error.message}`)
  }
}

/**
 * Tổng hợp Alerts
 */
const getAlerts = async (locationId) => {
  try {
    const [equipmentIssues, lowEnrollmentClasses] = await Promise.all([
      getEquipmentIssues(locationId),
      getLowEnrollmentClasses(locationId),
    ])

    return {
      equipmentIssues,
      lowEnrollmentClasses,
    }
  } catch (error) {
    throw new Error(`Error getting alerts: ${error.message}`)
  }
}

/**
 * ============================================
 * TOP PERFORMING PT
 * ============================================
 */
const getTopPerformingTrainers = async (locationId) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

    const pipeline = [
      {
        $match: {
          locationId: new ObjectId(locationId),
          status: BOOKING_STATUS.COMPLETED,
          _destroy: false,
        },
      },
      {
        $lookup: {
          from: SCHEDULE_COLLECTION_NAME,
          localField: 'scheduleId',
          foreignField: '_id',
          as: 'schedule',
        },
      },
      {
        $unwind: '$schedule',
      },
      {
        $lookup: {
          from: PAYMENT_COLLECTION_NAME,
          let: { bookingId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$referenceId', '$$bookingId'] },
                    { $eq: ['$paymentType', PAYMENT_TYPE.BOOKING] },
                    { $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] },
                    { $gte: ['$paymentDate', startOfMonth] },
                    { $lte: ['$paymentDate', endOfMonth] },
                  ],
                },
                _destroy: false,
              },
            },
          ],
          as: 'payment',
        },
      },
      {
        $unwind: {
          path: '$payment',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $group: {
          _id: '$schedule.trainerId',
          revenue: { $sum: '$payment.amount' },
          sessions: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: TRAINER_COLLECTION_NAME,
          localField: '_id',
          foreignField: '_id',
          as: 'trainer',
        },
      },
      {
        $unwind: '$trainer',
      },
      {
        $lookup: {
          from: USER_COLLECTION_NAME,
          localField: 'trainer.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: REVIEW_COLLECTION_NAME,
          localField: '_id',
          foreignField: 'trainerId',
          as: 'reviews',
        },
      },
      {
        $addFields: {
          avgRating: {
            $cond: {
              if: { $gt: [{ $size: '$reviews' }, 0] },
              then: { $avg: '$reviews.rating' },
              else: 0,
            },
          },
        },
      },
      {
        $sort: { revenue: -1 },
      },
      {
        $limit: 3,
      },
      {
        $project: {
          id: '$_id',
          name: '$user.fullName',
          revenue: 1,
          sessions: 1,
          avgRating: { $round: ['$avgRating', 1] },
        },
      },
    ]

    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result
  } catch (error) {
    throw new Error(`Error getting top performing trainers: ${error.message}`)
  }
}

/**
 * ============================================
 * LỊCH LỚP HỌC HÔM NAY
 * ============================================
 */
const getTodayClasses = async (locationId) => {
  try {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

    // Lấy tất cả classes của location
    const classes = await GET_DB()
      .collection(CLASS_COLLECTION_NAME)
      .find({
        locationId: new ObjectId(locationId),
        _destroy: false,
      })
      .project({ _id: 1 })
      .toArray()

    const classIds = classes.map((c) => c._id)

    const pipeline = [
      {
        $match: {
          classId: { $in: classIds },
          startTime: { $gte: startOfDay, $lte: endOfDay },
          _destroy: false,
        },
      },
      {
        $lookup: {
          from: CLASS_COLLECTION_NAME,
          localField: 'classId',
          foreignField: '_id',
          as: 'class',
        },
      },
      {
        $unwind: '$class',
      },
      {
        $lookup: {
          from: ROOM_COLLECTION_NAME,
          localField: 'roomId',
          foreignField: '_id',
          as: 'room',
        },
      },
      {
        $unwind: {
          path: '$room',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: TRAINER_COLLECTION_NAME,
          let: { trainerIds: '$trainers' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$trainerIds'],
                },
              },
            },
            {
              $lookup: {
                from: USER_COLLECTION_NAME,
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
              },
            },
            {
              $unwind: '$user',
            },
            {
              $limit: 1,
            },
          ],
          as: 'trainerInfo',
        },
      },
      {
        $sort: { startTime: 1 },
      },
      {
        $project: {
          id: '$_id',
          className: '$class.name',
          trainerName: {
            $ifNull: [{ $arrayElemAt: ['$trainerInfo.user.fullName', 0] }, 'Chưa có PT'],
          },
          roomName: {
            $ifNull: ['$room.name', 'Chưa có phòng'],
          },
          startTime: 1,
          endTime: 1,
          enrolled: { $size: { $ifNull: ['$users', []] } },
          capacity: '$class.capacity',
        },
      },
    ]

    const result = await GET_DB().collection(CLASS_SESSION_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result
  } catch (error) {
    throw new Error(`Error getting today classes: ${error.message}`)
  }
}

/**
 * ============================================
 * HÀM TỔNG HỢP
 * ============================================
 */
const getAllStaffDashboardData = async (locationId) => {
  try {
    const [overview, checkinChart, equipmentStatus, alerts, topPerformers, todayClasses] = await Promise.all([
      getOverviewStats(locationId),
      getCheckinChart7Days(locationId),
      getEquipmentStatus(locationId),
      getAlerts(locationId),
      getTopPerformingTrainers(locationId),
      getTodayClasses(locationId),
    ])

    return {
      overview,
      checkinChart,
      equipmentStatus,
      alerts,
      topPerformers: {
        trainers: topPerformers,
      },
      todayClasses,
    }
  } catch (error) {
    throw new Error(`Error getting all staff dashboard data: ${error.message}`)
  }
}

export const staffDashboardStatisticsModel = {
  // Overview Stats
  getTodayCheckins,
  getMonthlyRevenue,
  getTotalEquipments,
  getActiveClasses,
  getOverviewStats,

  // Charts
  getCheckinChart7Days,
  getEquipmentStatus,

  // Alerts
  getEquipmentIssues,
  getLowEnrollmentClasses,
  getAlerts,

  // Top Performers
  getTopPerformingTrainers,

  // Today Classes
  getTodayClasses,

  // All Data
  getAllStaffDashboardData,
}
