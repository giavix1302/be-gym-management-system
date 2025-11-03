import cron from 'node-cron'
import { notificationService } from '~/modules/notification/service/notification.service'

class NotificationCleanupJob {
  // Chạy cleanup mỗi ngày lúc 2h sáng
  static startCleanupJob() {
    cron.schedule(
      '0 2 * * *',
      async () => {
        console.log('Starting notification cleanup job...')

        try {
          const result = await notificationService.cleanupOldNotifications()
          console.log(`Cleanup completed: ${result.deletedCount} notifications deleted`)
        } catch (error) {
          console.error('Notification cleanup job failed:', error.message)
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    )

    console.log('Notification cleanup job scheduled (daily at 2:00 AM)')
  }
}

export default NotificationCleanupJob
