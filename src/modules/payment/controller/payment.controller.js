import { StatusCodes } from 'http-status-codes'

import { paymentService } from '../service/payment.service'

const createPaymentVnpay = async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentVnpay(req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const vnpReturn = async (req, res) => {
  try {
    const result = await paymentService.vnpReturn(req.query)

    if (result.success) {
      res.redirect(result.url)
    } else {
      res.redirect(result.url)
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

const createPaymentBookingPtVnpay = async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentBookingPtVnpay(req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const createPaymentClassVnpay = async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentClassVnpay(req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const updateRefundPayment = async (req, res, next) => {
  try {
    const { id } = req.params
    console.log('🚀 ~ updateRefundPayment ~ req.body:', req.body)
    const result = await paymentService.updateRefundPayment(id, req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// Lấy danh sách payment theo userId
const getPaymentsByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    const result = await paymentService.getPaymentsByUserId(userId, page, limit)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// Lấy danh sách tất cả payment cho admin
const getAllPaymentsForAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query

    const result = await paymentService.getAllPaymentsForAdmin(page, limit)

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
 * ============================================
 * CONTROLLERS THỐNG KÊ MỚI
 * ============================================
 */

/**
 * Lấy tổng quan thống kê payments (4 cards)
 * GET /api/v1/payments/statistics/overview
 * Query params: startDate, endDate
 */
const getPaymentOverviewStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    const result = await paymentService.getPaymentOverviewStats(startDate, endDate)

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
 * Lấy doanh thu theo loại thanh toán (Chart 1)
 * GET /api/v1/payments/statistics/revenue-by-type
 * Query params: startDate, endDate
 */
const getPaymentRevenueByType = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    const result = await paymentService.getPaymentRevenueByType(startDate, endDate)

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
 * Lấy xu hướng doanh thu theo thời gian (Chart 2)
 * GET /api/v1/payments/statistics/revenue-trend
 * Query params: startDate, endDate, groupBy (day/week/month)
 */
const getPaymentRevenueTrend = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query

    const result = await paymentService.getPaymentRevenueTrend(startDate, endDate, groupBy)

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
 * Lấy phân bố phương thức thanh toán (Chart 3)
 * GET /api/v1/payments/statistics/payment-methods
 * Query params: startDate, endDate
 */
const getPaymentMethodDistribution = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    const result = await paymentService.getPaymentMethodDistribution(startDate, endDate)

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
 * Lấy trạng thái thanh toán theo thời gian (Chart 4)
 * GET /api/v1/payments/statistics/status-over-time
 * Query params: startDate, endDate, groupBy (day/week/month)
 */
const getPaymentStatusOverTime = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query

    const result = await paymentService.getPaymentStatusOverTime(startDate, endDate, groupBy)

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
 * Lấy tất cả thống kê cùng lúc (tối ưu cho dashboard)
 * GET /api/v1/payments/statistics/all
 * Query params: startDate, endDate, groupBy (day/week/month)
 */
const getAllPaymentStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query

    const result = await paymentService.getAllPaymentStatistics(startDate, endDate, groupBy)

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
 * Lấy top khách hàng chi tiêu nhiều nhất (Bonus)
 * GET /api/v1/payments/statistics/top-customers
 * Query params: startDate, endDate, limit
 */
const getTopSpendingCustomers = async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query

    const result = await paymentService.getTopSpendingCustomers(startDate, endDate, parseInt(limit))

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const paymentController = {
  createPaymentVnpay,
  vnpReturn,
  createPaymentBookingPtVnpay,
  createPaymentClassVnpay,
  getPaymentsByUserId,
  getAllPaymentsForAdmin,
  updateRefundPayment,

  // Controllers thống kê mới
  getPaymentOverviewStats,
  getPaymentRevenueByType,
  getPaymentRevenueTrend,
  getPaymentMethodDistribution,
  getPaymentStatusOverTime,
  getAllPaymentStatistics,
  getTopSpendingCustomers,
}
