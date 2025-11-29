/* eslint-disable indent */
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const STAFF_SHIFT_COLLECTION_NAME = 'staff_shifts'
const STAFF_SHIFT_COLLECTION_SCHEMA = Joi.object({
  staffId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  checkinTime: Joi.string().isoDate().allow('').default(''),
  checkoutTime: Joi.string().isoDate().allow('').default(''),
  hours: Joi.number().default(0),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await STAFF_SHIFT_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    // Convert staffId to ObjectId
    const staffShiftData = {
      ...validData,
      staffId: new ObjectId(String(validData.staffId)),
    }

    const createdStaffShift = await GET_DB().collection(STAFF_SHIFT_COLLECTION_NAME).insertOne(staffShiftData)
    return createdStaffShift
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (id) => {
  try {
    const db = await GET_DB()
    const detail = await db
      .collection(STAFF_SHIFT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            _id: new ObjectId(String(id)),
            _destroy: false,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'staffId',
            foreignField: '_id',
            as: 'staffInfo',
          },
        },
        {
          $addFields: {
            staffInfo: { $arrayElemAt: ['$staffInfo', 0] },
          },
        },
      ])
      .toArray()

    return detail[0] || null
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailByStaffId = async (staffId) => {
  try {
    const db = await GET_DB()
    const detail = await db
      .collection(STAFF_SHIFT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            staffId: new ObjectId(String(staffId)),
            _destroy: false,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'staffId',
            foreignField: '_id',
            as: 'staffInfo',
          },
        },
        {
          $addFields: {
            staffInfo: { $arrayElemAt: ['$staffInfo', 0] },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
      ])
      .toArray()

    return detail[0] || null
  } catch (error) {
    throw new Error(error)
  }
}

const getListByStaffId = async (staffId) => {
  try {
    const db = await GET_DB()
    const shifts = await db
      .collection(STAFF_SHIFT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            staffId: new ObjectId(String(staffId)),
            _destroy: false,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'staffId',
            foreignField: '_id',
            as: 'staffInfo',
          },
        },
        {
          $addFields: {
            staffInfo: { $arrayElemAt: ['$staffInfo', 0] },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray()

    return shifts
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (_id, updateData) => {
  try {
    const updatedStaffShift = await GET_DB()
      .collection(STAFF_SHIFT_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(_id)), _destroy: false },
        { $set: updateData },
        { returnDocument: 'after' }
      )
    return updatedStaffShift
  } catch (error) {
    throw new Error(error)
  }
}

// Thêm vào cuối file staffShiftModel

/**
 * Lấy thống kê tổng quan của nhân viên
 * @param {string} staffId - ID của staff
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Object} - { totalHours, totalShifts, totalIncome }
 */
const getStaffStatistics = async (staffId, startDate, endDate) => {
  try {
    const db = await GET_DB()

    // Lấy thông tin staff để lấy hourlyRate
    const staff = await db.collection('staffs').findOne({
      _id: new ObjectId(String(staffId)),
      _destroy: false,
    })

    if (!staff) {
      throw new Error('Staff not found')
    }

    const result = await db
      .collection(STAFF_SHIFT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            staffId: new ObjectId(String(staffId)),
            _destroy: false,
            checkoutTime: { $ne: '', $exists: true }, // Chỉ tính shift đã checkout
            checkinTime: {
              $gte: startDate.toISOString(),
              $lte: endDate.toISOString(),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalHours: { $sum: '$hours' },
            totalShifts: { $sum: 1 },
          },
        },
      ])
      .toArray()

    const stats = result[0] || { totalHours: 0, totalShifts: 0 }

    return {
      totalHours: stats.totalHours,
      totalShifts: stats.totalShifts,
      totalIncome: stats.totalHours * staff.hourlyRate,
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy dữ liệu biểu đồ giờ làm việc theo groupBy
 * @param {string} staffId - ID của staff
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {string} groupBy - 'day' | 'week' | 'month'
 * @returns {Array} - Mảng dữ liệu chart
 */
const getWorkingHoursChart = async (staffId, startDate, endDate, groupBy = 'week') => {
  try {
    const db = await GET_DB()

    let dateFormat
    let groupFormat

    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d'
        groupFormat = {
          year: { $year: { $toDate: '$checkinTime' } },
          month: { $month: { $toDate: '$checkinTime' } },
          day: { $dayOfMonth: { $toDate: '$checkinTime' } },
        }
        break
      case 'week':
        dateFormat = '%Y-W%V' // ISO Week
        groupFormat = {
          year: { $isoWeekYear: { $toDate: '$checkinTime' } },
          week: { $isoWeek: { $toDate: '$checkinTime' } },
        }
        break
      case 'month':
        dateFormat = '%Y-%m'
        groupFormat = {
          year: { $year: { $toDate: '$checkinTime' } },
          month: { $month: { $toDate: '$checkinTime' } },
        }
        break
      default:
        dateFormat = '%Y-W%V'
        groupFormat = {
          year: { $isoWeekYear: { $toDate: '$checkinTime' } },
          week: { $isoWeek: { $toDate: '$checkinTime' } },
        }
    }

    const result = await db
      .collection(STAFF_SHIFT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            staffId: new ObjectId(String(staffId)),
            _destroy: false,
            checkoutTime: { $ne: '', $exists: true },
            checkinTime: {
              $gte: startDate.toISOString(),
              $lte: endDate.toISOString(),
            },
          },
        },
        {
          $addFields: {
            checkinDate: { $toDate: '$checkinTime' },
          },
        },
        {
          $group: {
            _id: groupFormat,
            totalHours: { $sum: '$hours' },
            shiftCount: { $sum: 1 },
            period: { $first: { $dateToString: { format: dateFormat, date: '$checkinDate' } } },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 },
        },
        {
          $project: {
            _id: 0,
            period: 1,
            totalHours: { $round: ['$totalHours', 2] },
            shiftCount: 1,
          },
        },
      ])
      .toArray()

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy dữ liệu biểu đồ thu nhập theo groupBy
 * @param {string} staffId - ID của staff
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {string} groupBy - 'day' | 'week' | 'month'
 * @returns {Array} - Mảng dữ liệu chart thu nhập
 */
const getIncomeChart = async (staffId, startDate, endDate, groupBy = 'week') => {
  try {
    const db = await GET_DB()

    // Lấy hourlyRate của staff
    const staff = await db.collection('staffs').findOne({
      _id: new ObjectId(String(staffId)),
      _destroy: false,
    })

    if (!staff) {
      throw new Error('Staff not found')
    }

    let dateFormat
    let groupFormat

    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d'
        groupFormat = {
          year: { $year: { $toDate: '$checkinTime' } },
          month: { $month: { $toDate: '$checkinTime' } },
          day: { $dayOfMonth: { $toDate: '$checkinTime' } },
        }
        break
      case 'week':
        dateFormat = '%Y-W%V'
        groupFormat = {
          year: { $isoWeekYear: { $toDate: '$checkinTime' } },
          week: { $isoWeek: { $toDate: '$checkinTime' } },
        }
        break
      case 'month':
        dateFormat = '%Y-%m'
        groupFormat = {
          year: { $year: { $toDate: '$checkinTime' } },
          month: { $month: { $toDate: '$checkinTime' } },
        }
        break
      default:
        dateFormat = '%Y-W%V'
        groupFormat = {
          year: { $isoWeekYear: { $toDate: '$checkinTime' } },
          week: { $isoWeek: { $toDate: '$checkinTime' } },
        }
    }

    const result = await db
      .collection(STAFF_SHIFT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            staffId: new ObjectId(String(staffId)),
            _destroy: false,
            checkoutTime: { $ne: '', $exists: true },
            checkinTime: {
              $gte: startDate.toISOString(),
              $lte: endDate.toISOString(),
            },
          },
        },
        {
          $addFields: {
            checkinDate: { $toDate: '$checkinTime' },
          },
        },
        {
          $group: {
            _id: groupFormat,
            totalHours: { $sum: '$hours' },
            period: { $first: { $dateToString: { format: dateFormat, date: '$checkinDate' } } },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 },
        },
        {
          $project: {
            _id: 0,
            period: 1,
            totalHours: { $round: ['$totalHours', 2] },
            income: { $round: [{ $multiply: ['$totalHours', staff.hourlyRate] }, 0] },
          },
        },
      ])
      .toArray()

    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const staffShiftModel = {
  STAFF_SHIFT_COLLECTION_NAME,
  STAFF_SHIFT_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getDetailByStaffId,
  getListByStaffId,
  updateInfo,

  // Statistics functions
  getStaffStatistics,
  getWorkingHoursChart,
  getIncomeChart,
}
