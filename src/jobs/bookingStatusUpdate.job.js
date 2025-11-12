import cron from 'node-cron'
import { bookingModel } from '~/modules/booking/model/booking.model'
import { BOOKING_STATUS } from '~/utils/constants'

class BookingStatusUpdateJob {
  // Chạy mỗi 2 giờ để check booking cần update status
  static startBookingStatusUpdateJob() {
    cron.schedule(
      '0 */2 * * *', // Mỗi 2 giờ
      async () => {
        console.log('Checking bookings to update status from booking to completed...')

        try {
          // Sử dụng hàm có sẵn trong booking model
          const bookingsToComplete = await bookingModel.getBookingsToUpdateStatus()

          console.log(`Found ${bookingsToComplete.length} bookings to mark as completed`)

          if (bookingsToComplete.length > 0) {
            // Extract booking IDs
            const bookingIds = bookingsToComplete.map((booking) => booking._id)

            // Update tất cả bookings cùng lúc bằng hàm có sẵn
            const updateResult = await bookingModel.updateMultipleBookingStatus(bookingIds, BOOKING_STATUS.COMPLETED)

            console.log(
              `Successfully updated ${updateResult.modifiedCount}/${updateResult.matchedCount} bookings to completed`
            )

            // Log chi tiết từng booking được update
            bookingsToComplete.forEach((booking) => {
              console.log(
                `- Booking ${booking._id}: ${booking.startTime} → ${booking.endTime} (User: ${booking.userId})`
              )
            })
          }

          console.log(`Booking status update completed - processed ${bookingsToComplete.length} bookings`)
        } catch (error) {
          console.error('Booking status update job failed:', error.message)
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    )

    console.log('Booking status update job scheduled (every 2 hours)')
  }
}

export default BookingStatusUpdateJob
