import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoute } from '~/modules/user/router/user.route.js'
import { authRoute } from '~/modules/auth/router/auth.route.js'
import { memberRoute } from '~/modules/membership/router/membership.route.js'
import { paymentRoute } from '~/modules/payment/router/payment.route.js'
import { subscriptionRoute } from '~/modules/subscription/router/subscription.route.js'
import { locationRoute } from '~/modules/location/router/location.route.js'
import { trainerRoute } from '~/modules/trainer/router/trainer.route.js'
import { progressRoute } from '~/modules/progress/router/progress.route.js'
import { equipmentRoute } from '~/modules/equipment/router/equipment.route.js'
import { roomRoute } from '~/modules/room/router/room.route.js'
import { classRoute } from '~/modules/class/router/class.route.js'
import { bookingRoute } from '~/modules/booking/router/booking.route.js'
import { reviewRoute } from '~/modules/review/router/review.route'
import { scheduleRoute } from '~/modules/schedule/router/schedule.route'
import { classSessionRoute } from '~/modules/classSession/router/classSession.route'
import { classEnrollmentRoute } from '~/modules/classEnrollment/router/classEnrollment.route'
import { attendanceRoute } from '~/modules/attendance/router/attendance.route'
import { conversationRoute } from '~/modules/conversation/router/conversation.route'
import { chatbotRoute } from '~/modules/chatbot/router/chatbot.route'
import { notificationRoute } from '~/modules/notification/router/notification.route'
import { staffRoute } from '~/modules/staff/router/staff.route'
import { statisticsRoute } from '~/modules/statistics/router/statistics.route'

const Router = express.Router()

// Health check route
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({
    message: 'API is running',
  })
})

Router.use('/auths', authRoute)

Router.use('/users', userRoute)

Router.use('/memberships', memberRoute)

Router.use('/payments', paymentRoute)

Router.use('/subscriptions', subscriptionRoute)

Router.use('/locations', locationRoute)

Router.use('/trainers', trainerRoute)

Router.use('/progress', progressRoute)

Router.use('/equipments', equipmentRoute)

Router.use('/rooms', roomRoute)

Router.use('/classes', classRoute)

Router.use('/bookings', bookingRoute)

Router.use('/reviews', reviewRoute)

Router.use('/schedules', scheduleRoute)

Router.use('/class-enrollments', classEnrollmentRoute)

Router.use('/class-sessions', classSessionRoute)

Router.use('/attendances', attendanceRoute)

Router.use('/conversations', conversationRoute)

Router.use('/chatbot', chatbotRoute)

Router.use('/notifications', notificationRoute)

Router.use('/staffs', staffRoute)

Router.use('/statistics', statisticsRoute)

export const APIs_V1 = Router
