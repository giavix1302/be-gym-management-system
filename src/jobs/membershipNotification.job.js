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
  // Chạy mỗi ngày lúc 9h sáng để check membership expiring
  static startMembershipExpiringJob() {
    cron.schedule(
      '0 9 * * *',
      async () => {
        console.log('Checking memberships for expiring notifications...')

        try {
          // Lấy tất cả subscription đang active
          const activeSubscriptions = await subscriptionModel.getActiveSubscriptions()

          for (const subscription of activeSubscriptions) {
            const { userId, _id: subscriptionId, endDate, membershipId } = subscription

            if (!endDate) continue // Skip nếu không có endDate

            const endDateObj = new Date(endDate)
            const today = new Date()
            const timeDiff = endDateObj.getTime() - today.getTime()
            const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24))

            // Check xem có cần tạo notification không
            if (shouldCreateMembershipNotification(daysLeft)) {
              // Lấy thông tin membership
              const membershipInfo = await membershipModel.getDetailById(membershipId)
              if (!membershipInfo) continue

              // Tạo notification
              await notificationService.createMembershipExpiringNotification(
                userId.toString(),
                subscriptionId.toString(),
                membershipInfo.name,
                endDate,
                daysLeft
              )

              console.log(`Created expiring notification for user ${userId}, ${daysLeft} days left`)
            }
          }

          console.log('Membership expiring check completed')
        } catch (error) {
          console.error('Membership expiring job failed:', error.message)
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    )

    console.log('Membership expiring notification job scheduled (daily at 9:00 AM)')
  }

  // Chạy mỗi ngày lúc 10h sáng để check membership expired
  static startMembershipExpiredJob() {
    cron.schedule(
      '0 10 * * *',
      async () => {
        console.log('Checking memberships for expired notifications...')

        try {
          // Lấy subscription vừa expired (trong ngày hôm nay)
          const today = new Date()
          const startOfDay = new Date(today.setHours(0, 0, 0, 0))
          const endOfDay = new Date(today.setHours(23, 59, 59, 999))

          const expiredSubscriptions = await subscriptionModel.getExpiredSubscriptionsInRange(startOfDay, endOfDay)

          for (const subscription of expiredSubscriptions) {
            const { userId, _id: subscriptionId, membershipId } = subscription

            // Lấy thông tin membership
            const membershipInfo = await membershipModel.getDetailById(membershipId)
            if (!membershipInfo) continue

            // Tạo notification expired
            await notificationService.createMembershipExpiredNotification(
              userId.toString(),
              subscriptionId.toString(),
              membershipInfo.name
            )

            console.log(`Created expired notification for user ${userId}`)
          }

          console.log('Membership expired check completed')
        } catch (error) {
          console.error('Membership expired job failed:', error.message)
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    )

    console.log('Membership expired notification job scheduled (daily at 10:00 AM)')
  }
}

export default MembershipNotificationJob
