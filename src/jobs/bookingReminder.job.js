import cron from 'node-cron'
import { bookingModel } from '~/modules/booking/model/booking.model'
import { notificationService } from '~/modules/notification/service/notification.service'
import { NOTIFICATION_CONFIG } from '~/modules/notification/service/notification.config'

class BookingReminderJob {
  // Chạy mỗi 10 phút để check booking sắp tới trong 1 giờ
  static startBookingReminderJob() {
    cron.schedule(
      '*/10 * * * *',
      async () => {
        console.log('Checking upcoming bookings for reminders...')

        try {
          const reminderMinutes = NOTIFICATION_CONFIG.BOOKING_REMINDER.REMINDER_MINUTES
          const upcomingBookings = await bookingModel.getUpcomingBookingsForReminder(reminderMinutes)

          for (const booking of upcomingBookings) {
            const { _id: bookingId, title, userId, schedule, trainer, trainerUser, bookingUser, location } = booking

            // Tạo notification cho user
            await notificationService.createBookingReminderNotification(
              userId.toString(),
              bookingId.toString(),
              title,
              schedule.startTime,
              false, // isTrainer = false
              {
                trainerName: trainerUser.fullName,
                locationName: location.name,
                bookingTime: schedule.startTime,
              }
            )

            console.log(`Created booking reminder for user ${bookingUser.fullName}`)

            // Tạo notification cho trainer
            await notificationService.createBookingReminderNotification(
              trainer.userId.toString(),
              bookingId.toString(),
              title,
              schedule.startTime,
              true, // isTrainer = true
              {
                userName: bookingUser.fullName,
                locationName: location.name,
                bookingTime: schedule.startTime,
              }
            )

            console.log(`Created booking reminder for trainer ${trainerUser.fullName}`)
          }

          console.log(`Booking reminder check completed - processed ${upcomingBookings.length} bookings`)
        } catch (error) {
          console.error('Booking reminder job failed:', error.message)
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    )

    console.log('Booking reminder job scheduled (every 10 minutes)')
  }
}

export default BookingReminderJob
