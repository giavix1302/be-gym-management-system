/* eslint-disable indent */
import { sanitize } from '~/utils/utils'
import { progressModel } from '../model/progress.model'

const createNew = async (data) => {
  console.log('🚀 ~ createNew ~ data:', data)
  try {
    const newProgress = {
      userId: data.userId,
      measurementDate: data.measurementDate || new Date().toISOString(),
      weight: Number(data.weight),
      bodyFat: Number(data.bodyFat),
      muscleMass: Number(data.muscleMass),
      note: data.note || '',
    }

    const createdProgress = await progressModel.createNew(newProgress)
    console.log('🚀 ~ createNew ~ createdProgress:', createdProgress)
    const getNewProgress = await progressModel.getDetailById(createdProgress.insertedId.toString())

    return {
      success: true,
      message: 'Progress record created successfully',
      data: {
        ...sanitize(getNewProgress),
      },
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to create progress record',
      error: error.message,
    }
  }
}

const getDetailById = async (progressId) => {
  try {
    const progress = await progressModel.getDetailById(progressId)

    if (!progress) {
      return {
        success: false,
        message: 'Progress record not found',
      }
    }

    return {
      success: true,
      data: sanitize(progress),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getAllByUserId = async (userId, options = {}) => {
  try {
    const progressList = await progressModel.getAllByUserId(userId, options)

    return {
      success: true,
      data: progressList.map((progress) => sanitize(progress)),
      total: progressList.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (progressId, updateData) => {
  try {
    // Kiểm tra progress record có tồn tại không
    const existingProgress = await progressModel.getDetailById(progressId)
    if (!existingProgress) {
      return {
        success: false,
        message: 'Progress record not found',
      }
    }

    const result = await progressModel.updateInfo(progressId, updateData)

    return {
      success: true,
      message: 'Progress record updated successfully',
      data: sanitize(result.value),
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to update progress record',
      error: error.message,
    }
  }
}

const deleteProgress = async (progressId) => {
  try {
    // Kiểm tra progress record có tồn tại không
    const existingProgress = await progressModel.getDetailById(progressId)
    if (!existingProgress) {
      return {
        success: false,
        message: 'Progress record not found',
      }
    }

    const result = await progressModel.deleteProgress(progressId)

    return {
      success: true,
      message: 'Progress record deleted successfully',
      data: sanitize(result.value),
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to delete progress record',
      error: error.message,
    }
  }
}

const getLatestByUserId = async (userId) => {
  try {
    const latestProgress = await progressModel.getLatestByUserId(userId)

    if (!latestProgress) {
      return {
        success: false,
        message: 'No progress records found for this user',
      }
    }

    return {
      success: true,
      data: sanitize(latestProgress),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getTrendData = async (userId, timeRange = 30) => {
  try {
    const trendData = await progressModel.getTrendData(userId, timeRange)
    console.log('🚀 ~ getTrendData ~ trendData:', trendData)

    return {
      success: true,
      data: trendData.map((record) => sanitize(record)),
      timeRange,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getComparisonData = async (userId) => {
  try {
    const comparisonData = await progressModel.getComparisonData(userId)

    if (!comparisonData) {
      return {
        success: false,
        message: 'Not enough data for comparison (need at least 2 records)',
      }
    }

    return {
      success: true,
      data: {
        current: sanitize(comparisonData.current),
        previous: sanitize(comparisonData.previous),
        changes: comparisonData.changes,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getStatistics = async (userId) => {
  try {
    const statistics = await progressModel.getStatistics(userId)

    if (!statistics) {
      return {
        success: false,
        message: 'No progress records found for statistics',
      }
    }

    return {
      success: true,
      data: {
        totalRecords: statistics.totalRecords,
        weight: {
          average: Number(statistics.avgWeight.toFixed(2)),
          min: statistics.minWeight,
          max: statistics.maxWeight,
        },
        bodyFat: {
          average: Number(statistics.avgBodyFat.toFixed(2)),
          min: statistics.minBodyFat,
          max: statistics.maxBodyFat,
        },
        muscleMass: {
          average: Number(statistics.avgMuscleMass.toFixed(2)),
          min: statistics.minMuscleMass,
          max: statistics.maxMuscleMass,
        },
        dateRange: {
          first: statistics.firstMeasurement,
          last: statistics.lastMeasurement,
        },
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Lấy dashboard data - tổng hợp tất cả thông tin cần thiết
const getDashboardData = async (userId) => {
  try {
    const [latest, comparison, statistics, trendData] = await Promise.all([
      progressModel.getLatestByUserId(userId),
      progressModel.getComparisonData(userId),
      progressModel.getStatistics(userId),
      progressModel.getTrendData(userId, 90), // 3 tháng gần nhất
    ])

    return {
      success: true,
      data: {
        latest: latest ? sanitize(latest) : null,
        comparison: comparison
          ? {
              current: sanitize(comparison.current),
              previous: sanitize(comparison.previous),
              changes: comparison.changes,
            }
          : null,
        statistics: statistics
          ? {
              totalRecords: statistics.totalRecords,
              weight: {
                average: Number(statistics.avgWeight.toFixed(2)),
                min: statistics.minWeight,
                max: statistics.maxWeight,
              },
              bodyFat: {
                average: Number(statistics.avgBodyFat.toFixed(2)),
                min: statistics.minBodyFat,
                max: statistics.maxBodyFat,
              },
              muscleMass: {
                average: Number(statistics.avgMuscleMass.toFixed(2)),
                min: statistics.minMuscleMass,
                max: statistics.maxMuscleMass,
              },
              dateRange: {
                first: statistics.firstMeasurement,
                last: statistics.lastMeasurement,
              },
            }
          : null,
        trendData: trendData.map((record) => sanitize(record)),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const progressService = {
  createNew,
  getDetailById,
  getAllByUserId,
  updateInfo,
  deleteProgress,
  getLatestByUserId,
  getTrendData,
  getComparisonData,
  getStatistics,
  getDashboardData,
}
