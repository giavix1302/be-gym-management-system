import { StatusCodes } from 'http-status-codes'
import { membershipService } from '../service/membership.service'

/**
 * CRUD Operations
 */

const addMembership = async (req, res, next) => {
  try {
    const result = await membershipService.addMembership(req)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListMembership = async (req, res, next) => {
  try {
    const result = await membershipService.getListMembership()

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const updateMemberShip = async (req, res, next) => {
  try {
    const result = await membershipService.updateMemberShip(req)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const deleteMembership = async (req, res, next) => {
  try {
    const membershipId = req.params.id

    const result = await membershipService.deleteMembership(membershipId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// =================================================================================
// MEMBERSHIP STATISTICS CONTROLLERS
// =================================================================================

/**
 * Lấy tổng quan membership analytics (4 cards)
 * Query params: startDate, endDate
 */
const getMembershipOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    const timeFilter = {}
    if (startDate) timeFilter.startDate = startDate
    if (endDate) timeFilter.endDate = endDate

    const result = await membershipService.getMembershipOverview(timeFilter)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy dữ liệu biểu đồ doanh thu membership
 * Query params: startDate (required), endDate (required), groupBy (day|week|month)
 */
const getMembershipRevenueChart = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query

    const result = await membershipService.getMembershipRevenueChart({
      startDate,
      endDate,
      groupBy,
    })

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy dữ liệu biểu đồ xu hướng membership
 * Query params: startDate (required), endDate (required), groupBy (day|week|month)
 */
const getMembershipTrendsChart = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query

    const result = await membershipService.getMembershipTrendsChart({
      startDate,
      endDate,
      groupBy,
    })

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy tất cả dữ liệu analytics membership (overview + charts)
 * Query params: startDate (required), endDate (required), groupBy (day|week|month)
 */
const getMembershipAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query

    const result = await membershipService.getMembershipAnalytics({
      startDate,
      endDate,
      groupBy,
    })

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const membershipController = {
  // CRUD operations
  addMembership,
  updateMemberShip,
  deleteMembership,
  getListMembership,

  // Statistics operations
  getMembershipOverview,
  getMembershipRevenueChart,
  getMembershipTrendsChart,
  getMembershipAnalytics,
}
