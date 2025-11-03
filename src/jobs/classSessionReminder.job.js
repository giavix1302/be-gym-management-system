import cron from 'node-cron'
import { classSessionModel } from '~/modules/classSession/model/classSession.model'
import { notificationService } from '~/modules/notification/service/notification.service'
import { NOTIFICATION_CONFIG } from '~/modules/notification/service/notification.config'

class ClassSessionReminderJob {
  // Chạy mỗi 10 phút để check class sessions sắp tới trong 1 giờ
  static startClassSessionReminderJob() {
    cron.schedule(
      '*/10 * * * *',
      async () => {
        console.log('Checking upcoming class sessions for reminders...')

        try {
          const reminderMinutes = NOTIFICATION_CONFIG.CLASS_SESSION_REMINDER.REMINDER_MINUTES
          const upcomingClassSessions = await classSessionModel.getUpcomingClassSessionsForReminder(reminderMinutes)

          for (const session of upcomingClassSessions) {
            const {
              _id: sessionId,
              title,
              startTime,
              users,
              trainers,
              class: classInfo,
              room,
              location,
              trainerUsers,
              enrolledUsers,
            } = session

            // Tạo notification cho tất cả users đã enrolled
            for (const user of enrolledUsers) {
              // Check user có active enrollment không
              const hasActiveEnrollment = await classSessionModel.checkUserActiveEnrollment(
                user._id.toString(),
                classInfo._id.toString()
              )

              if (hasActiveEnrollment) {
                await notificationService.createClassReminderNotification(
                  user._id.toString(),
                  sessionId.toString(),
                  classInfo.name,
                  startTime,
                  room.name,
                  false, // isTrainer = false
                  {
                    sessionTitle: title,
                    className: classInfo.name,
                    roomName: room.name,
                    locationName: location.name,
                    startTime: startTime,
                  }
                )

                console.log(`Created class session reminder for user ${user.fullName}`)
              }
            }

            // Tạo notification cho tất cả trainers
            for (const trainer of trainerUsers) {
              await notificationService.createClassReminderNotification(
                trainer._id.toString(),
                sessionId.toString(),
                classInfo.name,
                startTime,
                room.name,
                true, // isTrainer = true
                {
                  sessionTitle: title,
                  className: classInfo.name,
                  roomName: room.name,
                  locationName: location.name,
                  totalUsers: enrolledUsers.length,
                  startTime: startTime,
                }
              )

              console.log(`Created class session reminder for trainer ${trainer.fullName}`)
            }
          }

          console.log(`Class session reminder check completed - processed ${upcomingClassSessions.length} sessions`)
        } catch (error) {
          console.error('Class session reminder job failed:', error.message)
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    )

    console.log('Class session reminder job scheduled (every 10 minutes)')
  }
}

export default ClassSessionReminderJob
