import { StatusCodes } from 'http-status-codes'
import { bookingService } from '../service/booking.service'

const createBooking = async (req, res, next) => {
  try {
    const result = await bookingService.createBooking(req.body)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getBookingById = async (req, res, next) => {
  try {
    const bookingId = req.params.id
    const result = await bookingService.getBookingById(bookingId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getBookingsByTrainerId = async (req, res, next) => {
  try {
    const trainerId = req.params.id
    const result = await bookingService.getBookingsByTrainerId(trainerId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getUpcomingBookingsByUserId = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const result = await bookingService.getUpcomingBookingsByUserId(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getHistoryBookingsByUserId = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const result = await bookingService.getHistoryBookingsByUserId(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getBookingsByUserId = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const result = await bookingService.getBookingsByUserId(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getAllBookings = async (req, res, next) => {
  try {
    const result = await bookingService.getAllBookings()

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const updateBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id
    const result = await bookingService.updateBooking(bookingId, req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const deleteBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id
    console.log('🚀 ~ deleteBooking ~ bookingId:', bookingId)
    const result = await bookingService.deleteBooking(bookingId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const softDeleteBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id
    const result = await bookingService.softDeleteBooking(bookingId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const cancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id
    const result = await bookingService.cancelBooking(bookingId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const updateTrainerAdvice = async (req, res, next) => {
  try {
    const bookingId = req.params.id
    const advice = req.body

    const result = await bookingService.updateTrainerAdvice(bookingId, advice)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const bookingController = {
  createBooking,
  getBookingById,
  getBookingsByUserId,
  getAllBookings,
  getUpcomingBookingsByUserId,
  getHistoryBookingsByUserId,
  updateBooking,
  deleteBooking,
  softDeleteBooking,
  cancelBooking,
  getBookingsByTrainerId,
  updateTrainerAdvice,
}
