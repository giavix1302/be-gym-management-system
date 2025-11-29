import { StatusCodes } from 'http-status-codes'
import { trainerService } from '../service/trainer.service'

const createNew = async (req, res, next) => {
  try {
    const result = await trainerService.createNew(req)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getDetailByUserId = async (req, res, next) => {
  try {
    const userId = req.params.id
    const result = await trainerService.getDetailByUserId(userId)
    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListTrainerForUser = async (req, res, next) => {
  try {
    const result = await trainerService.getListTrainerForUser()
    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListTrainerForAdmin = async (req, res, next) => {
  try {
    const result = await trainerService.getListTrainerForAdmin()
    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const updateInfo = async (req, res, next) => {
  try {
    const userId = req.params.id
    const result = await trainerService.updateInfo(userId, req)
    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const updateIsApproved = async (req, res, next) => {
  try {
    const trainerId = req.params.id
    const result = await trainerService.updateIsApproved(trainerId, req.body)
    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// Hàm mới để lấy danh sách booking completed của trainer
const getListBookingByTrainerId = async (req, res, next) => {
  try {
    const userId = req.params.id // Lấy userId từ params
    const query = req.query // Lấy query parameters (page, limit)

    const result = await trainerService.getListBookingByTrainerId(userId, query)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: result.pagination,
      })
    } else {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: result.message,
      })
    }
  } catch (error) {
    console.error('Error in getListBookingByTrainerId controller:', error)
    next(error)
  }
}

// Hàm mới để lấy thống kê dashboard của trainer
const getTrainerDashboardStatsByUserId = async (req, res, next) => {
  try {
    const userId = req.params.id // Lấy userId từ params

    const result = await trainerService.getTrainerDashboardStatsByUserId(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: result.message,
        stats: result.stats,
      })
    } else {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: result.message,
      })
    }
  } catch (error) {
    console.error('Error in getTrainerDashboardStatsByUserId controller:', error)
    next(error)
  }
}

const getTrainerEventsForThreeMonths = async (req, res, next) => {
  try {
    const userId = req.params.id // Lấy userId từ params

    const result = await trainerService.getTrainerEventsForThreeMonths(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: result.message,
        events: result.events,
      })
    } else {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: result.message,
      })
    }
  } catch (error) {
    console.error('Error in getTrainerEventsForThreeMonths controller:', error)
    next(error)
  }
}

// NEW: Statistics Controllers
const getTotalTrainers = async (req, res, next) => {
  try {
    const result = await trainerService.getTotalTrainers()
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getActiveTrainers = async (req, res, next) => {
  try {
    const result = await trainerService.getActiveTrainers()
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getPendingTrainers = async (req, res, next) => {
  try {
    const result = await trainerService.getPendingTrainers()
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getTotalTrainerRevenue = async (req, res, next) => {
  try {
    const result = await trainerService.getTotalTrainerRevenue()
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getTrainerRevenueByTime = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy } = req.query

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'startDate and endDate are required query parameters',
      })
    }

    // Validate groupBy parameter
    const allowedGroupBy = ['day', 'week', 'month']
    const groupByValue = groupBy || 'month'
    if (!allowedGroupBy.includes(groupByValue)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'groupBy must be one of: day, week, month',
      })
    }

    const result = await trainerService.getTrainerRevenueByTime(startDate, endDate, groupByValue)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getTrainersBySpecialization = async (req, res, next) => {
  try {
    const result = await trainerService.getTrainersBySpecialization()
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getTrainingSessionsByTime = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy } = req.query

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'startDate and endDate are required query parameters',
      })
    }

    // Validate groupBy parameter
    const allowedGroupBy = ['day', 'week', 'month']
    const groupByValue = groupBy || 'day'
    if (!allowedGroupBy.includes(groupByValue)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'groupBy must be one of: day, week, month',
      })
    }

    const result = await trainerService.getTrainingSessionsByTime(startDate, endDate, groupByValue)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getTopTrainersByRevenue = async (req, res, next) => {
  try {
    const { limit } = req.query
    const limitValue = parseInt(limit) || 10

    // Validate limit
    if (limitValue < 1 || limitValue > 50) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'limit must be between 1 and 50',
      })
    }

    const result = await trainerService.getTopTrainersByRevenue(limitValue)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

// Thêm vào export
export const trainerController = {
  createNew,
  getDetailByUserId,
  getListTrainerForUser,
  getListTrainerForAdmin,
  updateInfo,
  updateIsApproved,
  getListBookingByTrainerId,
  getTrainerDashboardStatsByUserId,
  getTrainerEventsForThreeMonths,

  // Statistics Controllers
  getTotalTrainers,
  getActiveTrainers,
  getPendingTrainers,
  getTotalTrainerRevenue,
  getTrainerRevenueByTime,
  getTrainersBySpecialization,
  getTrainingSessionsByTime,
  getTopTrainersByRevenue,
}
