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
        console.log('🔄 Checking upcoming bookings for reminders...')

        try {
          const reminderMinutes = NOTIFICATION_CONFIG.BOOKING_REMINDER.REMINDER_MINUTES
          const upcomingBookings = await bookingModel.getUpcomingBookingsForReminder(reminderMinutes)

          console.log(`📋 Found ${upcomingBookings.length} upcoming bookings to process`)

          let processedCount = 0
          let skippedCount = 0
          let errorCount = 0

          for (const booking of upcomingBookings) {
            const { _id: bookingId, title, userId, schedule, trainer, trainerUser, bookingUser, location } = booking

            try {
              // ✅ Tạo notification cho user - handle response
              const userResult = await notificationService.createBookingReminderNotification(
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

              if (userResult.success) {
                console.log(`✅ Created booking reminder for user ${bookingUser.fullName}`)
                processedCount++
              } else if (userResult.reason === 'ALREADY_EXISTS') {
                console.log(`⚠️ User booking reminder already exists for ${bookingUser.fullName}`)
                skippedCount++
              } else {
                console.log(`❌ Failed to create user reminder: ${userResult.message}`)
                errorCount++
              }

              // ✅ Tạo notification cho trainer - handle response
              const trainerResult = await notificationService.createBookingReminderNotification(
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

              if (trainerResult.success) {
                console.log(`✅ Created booking reminder for trainer ${trainerUser.fullName}`)
                processedCount++
              } else if (trainerResult.reason === 'ALREADY_EXISTS') {
                console.log(`⚠️ Trainer booking reminder already exists for ${trainerUser.fullName}`)
                skippedCount++
              } else {
                console.log(`❌ Failed to create trainer reminder: ${trainerResult.message}`)
                errorCount++
              }
            } catch (error) {
              console.error(`❌ Error processing booking ${bookingId}:`, error.message)
              errorCount++
            }
          }

          // ✅ Tổng kết với thống kê chi tiết
          console.log(`🎯 Booking reminder job completed:`)
          console.log(`   📈 Processed: ${processedCount} notifications`)
          console.log(`   ⏭️ Skipped (duplicates): ${skippedCount} notifications`)
          console.log(`   ❌ Errors: ${errorCount} notifications`)
          console.log(`   🔍 Total bookings scanned: ${upcomingBookings.length}`)
        } catch (error) {
          console.error('💥 Booking reminder job failed:', error.message)
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    )

    console.log('⏰ Booking reminder job scheduled (every 10 minutes)')
  }
}

export default BookingReminderJob
