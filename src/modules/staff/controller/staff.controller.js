import { StatusCodes } from 'http-status-codes'
import { staffService } from '../service/staff.service'

/**
 * Add new staff
 */
const signupForStaff = async (req, res, next) => {
  try {
    const result = await staffService.signupForStaff(req.body)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const verifyForStaff = async (req, res, next) => {
  try {
    const result = await staffService.verifyForStaff(req.body)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get list of all staff
 */
const getListStaff = async (req, res, next) => {
  try {
    const result = await staffService.getListStaff()

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get staff details by ID
 */
const getDetailByUserId = async (req, res, next) => {
  try {
    const userId = req.params.id
    const result = await staffService.getDetailByUserId(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Update staff information
 */
const updateStaff = async (req, res, next) => {
  try {
    const result = await staffService.updateStaff(req)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Soft delete staff (set _destroy flag)
 */
const deleteStaff = async (req, res, next) => {
  try {
    const staffId = req.params.id
    const result = await staffService.deleteStaff(staffId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Hard delete staff (permanently remove from database)
 */
const hardDeleteStaff = async (req, res, next) => {
  try {
    const staffId = req.params.id
    const result = await staffService.hardDeleteStaff(staffId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const handleLogoutStaff = async (req, res, next) => {
  try {
    const staffId = req.params.id
    const result = await staffService.handleLogoutStaff(staffId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// ==================== STAFF STATISTICS CONTROLLERS ====================

/**
 * Get staff overview statistics (4 cards)
 * Query params: startDate, endDate
 */
const getStaffOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    const result = await staffService.getStaffOverview(startDate, endDate)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get working hours by staff chart data
 * Query params: startDate, endDate, limit
 */
const getWorkingHoursByStaff = async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query

    const result = await staffService.getWorkingHoursByStaff(startDate, endDate, parseInt(limit))

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get checkin trend chart data
 * Query params: startDate, endDate, groupBy (day/week/month)
 */
const getCheckinTrend = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query

    const result = await staffService.getCheckinTrend(startDate, endDate, groupBy)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get top working staff chart data
 * Query params: startDate, endDate, limit
 */
const getTopWorkingStaff = async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query

    const result = await staffService.getTopWorkingStaff(startDate, endDate, parseInt(limit))

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get salary cost by location chart data
 * Query params: startDate, endDate
 */
const getSalaryCostByLocation = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    const result = await staffService.getSalaryCostByLocation(startDate, endDate)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// ==================== PERSONAL STAFF STATISTICS CONTROLLERS ====================

/**
 * Get personal statistics (3 cards)
 * Query params: startDate, endDate
 * URL param: staffId
 */
const getMyStatistics = async (req, res, next) => {
  try {
    const staffId = req.params.id
    const { startDate, endDate } = req.query

    const result = await staffService.getMyStatistics(staffId, startDate, endDate)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get personal working hours chart
 * Query params: startDate, endDate, groupBy
 * URL param: staffId
 */
const getMyWorkingHoursChart = async (req, res, next) => {
  try {
    const staffId = req.params.id
    const { startDate, endDate, groupBy = 'week' } = req.query

    const result = await staffService.getMyWorkingHoursChart(staffId, startDate, endDate, groupBy)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get personal income chart
 * Query params: startDate, endDate, groupBy
 * URL param: staffId
 */
const getMyIncomeChart = async (req, res, next) => {
  try {
    const staffId = req.params.id
    const { startDate, endDate, groupBy = 'week' } = req.query

    const result = await staffService.getMyIncomeChart(staffId, startDate, endDate, groupBy)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const staffController = {
  signupForStaff,
  verifyForStaff,
  getListStaff,
  getDetailByUserId,
  updateStaff,
  deleteStaff,
  hardDeleteStaff,
  handleLogoutStaff,
  // Statistics controllers (Admin)
  getStaffOverview,
  getWorkingHoursByStaff,
  getCheckinTrend,
  getTopWorkingStaff,
  getSalaryCostByLocation,
  // Personal statistics controllers (Staff)
  getMyStatistics,
  getMyWorkingHoursChart,
  getMyIncomeChart,
}
