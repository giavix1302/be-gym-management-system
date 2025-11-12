import cron from 'node-cron'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model'
import { membershipModel } from '~/modules/membership/model/membership.model'
import { notificationService } from '~/modules/notification/service/notification.service'
import {
  NOTIFICATION_CONFIG,
  shouldCreateMembershipNotification,
} from '~/modules/notification/service/notification.config'
import { SUBSCRIPTION_STATUS } from '~/utils/constants'

class MembershipNotificationJob {
  // Chạy mỗi ngày lúc 5h sáng để check membership expiring
  static startMembershipExpiringJob() {
    cron.schedule(
      '0 5 * * *', // Thay đổi từ '0 9 * * *' thành '0 5 * * *'
      async () => {
        console.log('Checking memberships for expiring notifications...')

        try {
          // ... code giữ nguyên ...
        } catch (error) {
          console.error('Membership expiring job failed:', error.message)
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    )

    console.log('Membership expiring notification job scheduled (daily at 5:00 AM)') // Cập nhật message
  }

  // Chạy mỗi ngày lúc 5h05 sáng để check membership expired
  static startMembershipExpiredJob() {
    cron.schedule(
      '5 5 * * *', // Thay đổi từ '0 10 * * *' thành '5 5 * * *' (5h05 để tránh conflict)
      async () => {
        console.log('Checking memberships for expired notifications...')

        try {
          // ... code giữ nguyên ...
        } catch (error) {
          console.error('Membership expired job failed:', error.message)
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    )

    console.log('Membership expired notification job scheduled (daily at 5:05 AM)') // Cập nhật message
  }
}

export default MembershipNotificationJob
