import express from 'express'
import { bookingController } from '../controller/booking.controller'
import { bookingValidation } from '../validation/booking.validation'
import { authMiddleware } from '~/middlewares/auth.middleware'

const Router = express.Router()

// Base route: /api/bookings
Router.route('/')
  // Create new booking
  .post(authMiddleware, bookingValidation.createBooking, bookingController.createBooking)
  // Get all bookings
  .get(authMiddleware, bookingController.getAllBookings)

// Route for specific booking by ID: /api/bookings/:id
Router.route('/:id')
  // Get booking by ID
  .get(bookingValidation.validateBookingId, bookingController.getBookingById)
  // Update booking by ID
  .put(
    authMiddleware,
    bookingValidation.validateBookingId,
    bookingValidation.updateBooking,
    bookingController.updateBooking
  )
  // Delete booking by ID (hard delete)
  .delete(authMiddleware, bookingValidation.validateBookingId, bookingController.deleteBooking)

Router.route('/trainer/:id').get(bookingController.getBookingsByTrainerId)

// Route for user's bookings: /api/bookings/user/:userId
Router.route('/user/:userId').get(authMiddleware, bookingController.getBookingsByUserId)
Router.route('/user/:userId/upcoming').get(bookingController.getUpcomingBookingsByUserId) // remember add func auth token
Router.route('/user/:userId/history').get(bookingController.getHistoryBookingsByUserId)

// Route for soft delete: /api/bookings/:id/soft-delete
Router.route('/:id/soft-delete').patch(
  authMiddleware,
  bookingValidation.validateBookingId,
  bookingController.softDeleteBooking
)

// Route for cancel booking: /api/bookings/:id/cancel
Router.route('/:id/cancel').patch(bookingValidation.validateBookingId, bookingController.cancelBooking)

// Route for adding trainer advice: /api/bookings/:id/trainer-advice
Router.route('/:id/trainer-advice').patch(bookingController.updateTrainerAdvice)

export const bookingRoute = Router
