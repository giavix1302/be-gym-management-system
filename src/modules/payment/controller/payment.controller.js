import { StatusCodes } from 'http-status-codes'

import { paymentService } from '../service/payment.service'

const createPaymentVnpay = async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentVnpay(req.params)

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

export const paymentController = {
  createPaymentVnpay,
  vnpReturn,
  createPaymentBookingPtVnpay,
  createPaymentClassVnpay,
  getPaymentsByUserId,
  getAllPaymentsForAdmin,
}
