import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'

const PROGRESS_COLLECTION_NAME = 'progress'
const PROGRESS_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  measurementDate: Joi.string().isoDate().allow('').default(''),
  weight: Joi.number().min(1).precision(2).required(),
  bodyFat: Joi.number().min(1).precision(2).required(),
  muscleMass: Joi.number().min(1).precision(2).required(),
  note: Joi.string().trim().strict(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await PROGRESS_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const validateBeforeUpdate = async (data) => {
  const updateSchema = PROGRESS_COLLECTION_SCHEMA.fork(['userId'], (schema) => schema.optional())
  return await updateSchema.validateAsync(data, {
    abortEarly: false,
  })
}

// Tạo mới progress record
const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdProgress = await GET_DB().collection(PROGRESS_COLLECTION_NAME).insertOne(validData)
    return createdProgress
  } catch (error) {
    throw new Error(error)
  }
}

// Lấy chi tiết một progress record
const getDetailById = async (progressId) => {
  try {
    const progress = await GET_DB()
      .collection(PROGRESS_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(progressId)),
        _destroy: false,
      })
    return progress
  } catch (error) {
    throw new Error(error)
  }
}

// Lấy tất cả progress records của một user
const getAllByUserId = async (userId, options = {}) => {
  try {
    const { sortBy = 'measurementDate', sortOrder = -1, limit, skip } = options

    let query = GET_DB()
      .collection(PROGRESS_COLLECTION_NAME)
      .find({
        userId: String(userId),
        _destroy: false,
      })
      .sort({ [sortBy]: sortOrder })

    if (skip) query = query.skip(skip)
    if (limit) query = query.limit(limit)

    const progressList = await query.toArray()
    return progressList
  } catch (error) {
    throw new Error(error)
  }
}

// Cập nhật progress record
const updateInfo = async (progressId, updateData) => {
  try {
    const validData = await validateBeforeUpdate(updateData)
    const result = await GET_DB()
      .collection(PROGRESS_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(progressId)) },
        { $set: { ...validData, updatedAt: Date.now() } },
        { returnDocument: ReturnDocument.AFTER }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Soft delete progress record
const deleteProgress = async (progressId) => {
  try {
    const result = await GET_DB()
      .collection(PROGRESS_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(progressId)) },
        { $set: { _destroy: true, updatedAt: Date.now() } },
        { returnDocument: ReturnDocument.AFTER }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Lấy progress gần nhất của user
const getLatestByUserId = async (userId) => {
  try {
    const latestProgress = await GET_DB()
      .collection(PROGRESS_COLLECTION_NAME)
      .findOne(
        {
          userId: String(userId),
          _destroy: false,
        },
        {
          sort: { measurementDate: -1, createdAt: -1 },
        }
      )
    return latestProgress
  } catch (error) {
    throw new Error(error)
  }
}

// Thống kê xu hướng thay đổi theo thời gian
const getTrendData = async (userId, timeRange = 30) => {
  try {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - timeRange)

    // Thử lấy dữ liệu trong khoảng thời gian trước
    let trendData = await GET_DB()
      .collection(PROGRESS_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            userId: String(userId),
            _destroy: false,
            measurementDate: { $gte: fromDate.toISOString() },
          },
        },
        {
          $sort: { measurementDate: 1 },
        },
        {
          $project: {
            measurementDate: 1,
            weight: 1,
            bodyFat: 1,
            muscleMass: 1,
            createdAt: 1,
          },
        },
      ])
      .toArray()

    // Nếu không có dữ liệu trong khoảng thời gian, lấy tất cả dữ liệu (tối đa 20 records gần nhất)
    if (trendData.length === 0) {
      trendData = await GET_DB()
        .collection(PROGRESS_COLLECTION_NAME)
        .aggregate([
          {
            $match: {
              userId: String(userId),
              _destroy: false,
            },
          },
          {
            $sort: { measurementDate: 1, createdAt: 1 },
          },
          {
            $limit: 20,
          },
          {
            $project: {
              measurementDate: 1,
              weight: 1,
              bodyFat: 1,
              muscleMass: 1,
              createdAt: 1,
            },
          },
        ])
        .toArray()
    }

    return trendData
  } catch (error) {
    throw new Error(error)
  }
}

// So sánh với lần đo trước
const getComparisonData = async (userId) => {
  try {
    const lastTwoRecords = await GET_DB()
      .collection(PROGRESS_COLLECTION_NAME)
      .find({
        userId: String(userId),
        _destroy: false,
      })
      .sort({ measurementDate: -1, createdAt: -1 })
      .limit(2)
      .toArray()

    if (lastTwoRecords.length < 2) {
      return null // Không đủ dữ liệu để so sánh
    }

    const [current, previous] = lastTwoRecords

    return {
      current,
      previous,
      changes: {
        weight: {
          value: Number((current.weight - previous.weight).toFixed(2)),
          percentage: Number((((current.weight - previous.weight) / previous.weight) * 100).toFixed(2)),
        },
        bodyFat: {
          value: Number((current.bodyFat - previous.bodyFat).toFixed(2)),
          percentage: Number((((current.bodyFat - previous.bodyFat) / previous.bodyFat) * 100).toFixed(2)),
        },
        muscleMass: {
          value: Number((current.muscleMass - previous.muscleMass).toFixed(2)),
          percentage: Number((((current.muscleMass - previous.muscleMass) / previous.muscleMass) * 100).toFixed(2)),
        },
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Thống kê tổng quan
const getStatistics = async (userId) => {
  try {
    const stats = await GET_DB()
      .collection(PROGRESS_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            userId: String(userId),
            _destroy: false,
          },
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            avgWeight: { $avg: '$weight' },
            minWeight: { $min: '$weight' },
            maxWeight: { $max: '$weight' },
            avgBodyFat: { $avg: '$bodyFat' },
            minBodyFat: { $min: '$bodyFat' },
            maxBodyFat: { $max: '$bodyFat' },
            avgMuscleMass: { $avg: '$muscleMass' },
            minMuscleMass: { $min: '$muscleMass' },
            maxMuscleMass: { $max: '$muscleMass' },
            firstMeasurement: { $min: '$measurementDate' },
            lastMeasurement: { $max: '$measurementDate' },
          },
        },
      ])
      .toArray()

    return stats[0] || null
  } catch (error) {
    throw new Error(error)
  }
}

export const progressModel = {
  PROGRESS_COLLECTION_NAME,
  PROGRESS_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getAllByUserId,
  updateInfo,
  deleteProgress,
  getLatestByUserId,
  getTrendData,
  getComparisonData,
  getStatistics,
}
