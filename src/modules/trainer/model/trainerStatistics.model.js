import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb.config.js'
import { APPROVED_TYPE, BOOKING_STATUS, PAYMENT_TYPE, PAYMENT_STATUS, SPECIALIZATION_TYPE } from '~/utils/constants.js'

// Collection names
const TRAINER_COLLECTION_NAME = 'trainers'
const BOOKING_COLLECTION_NAME = 'bookings'
const PAYMENT_COLLECTION_NAME = 'payments'
const USER_COLLECTION_NAME = 'users'

/**
 * 1. Tổng Số Huấn Luyện Viên
 * Đếm từ bảng Trainers có isApproved = 'approved'
 */
const getTotalTrainers = async () => {
  try {
    const totalTrainers = await GET_DB().collection(TRAINER_COLLECTION_NAME).countDocuments({
      isApproved: APPROVED_TYPE.APPROVED,
      _destroy: false,
    })
    return totalTrainers
  } catch (error) {
    throw new Error(`Error getting total trainers: ${error.message}`)
  }
}

/**
 * 2. Huấn Luyện Viên Hoạt Động
 * Trainers có booking trong 30 ngày gần đây
 */
const getActiveTrainers = async () => {
  try {
    const thirtyDaysAgoTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000

    const pipeline = [
      {
        $match: {
          status: BOOKING_STATUS.COMPLETED,
          createdAt: { $gte: thirtyDaysAgoTimestamp },
          _destroy: false,
        },
      },
      {
        $group: {
          _id: '$trainerId',
        },
      },
      {
        $count: 'activeTrainers',
      },
    ]

    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.length > 0 ? result[0].activeTrainers : 0
  } catch (error) {
    throw new Error(`Error getting active trainers: ${error.message}`)
  }
}

/**
 * 3. PT Chờ Duyệt
 * Trainers có isApproved = 'pending'
 */
const getPendingTrainers = async () => {
  try {
    const pendingTrainers = await GET_DB().collection(TRAINER_COLLECTION_NAME).countDocuments({
      isApproved: APPROVED_TYPE.PENDING,
      _destroy: false,
    })
    return pendingTrainers
  } catch (error) {
    throw new Error(`Error getting pending trainers: ${error.message}`)
  }
}

/**
 * 4. Tổng Doanh Thu PT
 * Tổng từ Payments có paymentType = 'booking'
 */
const getTotalTrainerRevenue = async () => {
  try {
    const result = await GET_DB()
      .collection(PAYMENT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            paymentType: PAYMENT_TYPE.BOOKING,
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
    throw new Error(`Error getting total trainer revenue: ${error.message}`)
  }
}

/**
 * BIỂU ĐỒ 1: Doanh Thu PT Theo Thời Gian
 * Filter: Khoảng thời gian
 */
const getTrainerRevenueByTime = async (startDate, endDate, groupBy = 'month') => {
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
      default:
        dateFormat = '%Y-%m'
        break
    }

    // Build match condition
    const matchCondition = {
      paymentType: PAYMENT_TYPE.BOOKING,
      _destroy: false,
    }

    // Add date filter if provided - paymentDate is ISO string
    if (startDate && endDate) {
      matchCondition.paymentDate = {
        $gte: new Date(startDate).toISOString(),
        $lte: new Date(endDate).toISOString(),
      }
    }

    const pipeline = [
      {
        $match: matchCondition,
      },
      {
        $addFields: {
          paymentDateObj: {
            $dateFromString: {
              dateString: '$paymentDate',
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$paymentDateObj',
            },
          },
          revenue: { $sum: '$amount' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.map((item) => ({
      period: item._id,
      revenue: item.revenue,
    }))
  } catch (error) {
    throw new Error(`Error getting trainer revenue by time: ${error.message}`)
  }
}
/**
 * BIỂU ĐỒ 2: Phân Bố PT Theo Chuyên Môn
 */
const getTrainersBySpecialization = async () => {
  try {
    const pipeline = [
      {
        $match: {
          isApproved: APPROVED_TYPE.APPROVED,
          _destroy: false,
        },
      },
      {
        $group: {
          _id: '$specialization',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]

    const result = await GET_DB().collection(TRAINER_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.map((item) => ({
      specialization: item._id || 'Unknown',
      count: item.count,
    }))
  } catch (error) {
    throw new Error(`Error getting trainers by specialization: ${error.message}`)
  }
}

/**
 * BIỂU ĐỒ 3: Số Buổi Tập Theo Thời Gian
 * Filter: Khoảng thời gian
 */
const getTrainingSessionsByTime = async (startDate, endDate, groupBy = 'day') => {
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
      status: BOOKING_STATUS.COMPLETED,
      _destroy: false,
    }

    // Add date filter if provided - assuming createdAt is timestamp
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
          sessions: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]

    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.map((item) => ({
      period: item._id,
      sessions: item.sessions,
    }))
  } catch (error) {
    throw new Error(`Error getting training sessions by time: ${error.message}`)
  }
}

/**
 * BIỂU ĐỒ 4: Top PT Có Doanh Thu Cao Nhất
 * Join Trainers với Payments, group theo trainerId
 */
const getTopTrainersByRevenue = async (limit = 10) => {
  try {
    const pipeline = [
      {
        $match: {
          paymentType: PAYMENT_TYPE.BOOKING,
          _destroy: false,
        },
      },
      // Group by referenceId (which is bookingId)
      {
        $group: {
          _id: '$referenceId',
          totalRevenue: { $sum: '$amount' },
        },
      },
      // Lookup booking to get scheduleId
      {
        $lookup: {
          from: BOOKING_COLLECTION_NAME,
          localField: '_id',
          foreignField: '_id',
          as: 'booking',
        },
      },
      {
        $unwind: '$booking',
      },
      // Lookup schedule to get trainerId
      {
        $lookup: {
          from: 'schedules',
          localField: 'booking.scheduleId',
          foreignField: '_id',
          as: 'schedule',
        },
      },
      {
        $unwind: '$schedule',
      },
      // Group by trainerId from schedule
      {
        $group: {
          _id: '$schedule.trainerId',
          totalRevenue: { $sum: '$totalRevenue' },
        },
      },
      // Lookup trainer info
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
      // Lookup user info for trainer name
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
        $project: {
          trainerId: '$_id',
          trainerName: '$user.fullName',
          specialization: '$trainer.specialization',
          totalRevenue: 1,
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
      {
        $limit: limit,
      },
    ]

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result.map((item) => ({
      trainerId: item.trainerId,
      trainerName: item.trainerName || 'Unknown',
      specialization: item.specialization || 'Unknown',
      revenue: item.totalRevenue,
    }))
  } catch (error) {
    throw new Error(`Error getting top trainers by revenue: ${error.message}`)
  }
}

/**
 * Hàm tổng hợp lấy tất cả thống kê tổng quan
 */
const getOverviewStats = async () => {
  try {
    const [totalTrainers, activeTrainers, pendingTrainers, totalRevenue] = await Promise.all([
      getTotalTrainers(),
      getActiveTrainers(),
      getPendingTrainers(),
      getTotalTrainerRevenue(),
    ])

    return {
      totalTrainers,
      activeTrainers,
      pendingTrainers,
      totalRevenue,
    }
  } catch (error) {
    throw new Error(`Error getting trainer overview stats: ${error.message}`)
  }
}

/**
 * Hàm tổng hợp lấy tất cả biểu đồ với filter thời gian
 */
const getAllChartsData = async (startDate, endDate, timeGroupBy = 'month') => {
  try {
    const [revenueByTime, trainersBySpecialization, sessionsByTime, topTrainers] = await Promise.all([
      getTrainerRevenueByTime(startDate, endDate, timeGroupBy),
      getTrainersBySpecialization(),
      getTrainingSessionsByTime(startDate, endDate, timeGroupBy),
      getTopTrainersByRevenue(10),
    ])

    return {
      revenueByTime,
      trainersBySpecialization,
      sessionsByTime,
      topTrainers,
    }
  } catch (error) {
    throw new Error(`Error getting all trainer charts data: ${error.message}`)
  }
}

export const trainerStatisticsModel = {
  // Overview Stats
  getTotalTrainers,
  getActiveTrainers,
  getPendingTrainers,
  getTotalTrainerRevenue,
  getOverviewStats,

  // Charts Data
  getTrainerRevenueByTime,
  getTrainersBySpecialization,
  getTrainingSessionsByTime,
  getTopTrainersByRevenue,
  getAllChartsData,
}
