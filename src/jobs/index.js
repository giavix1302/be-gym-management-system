import NotificationCleanupJob from './notificationCleanup.job.js'
import MembershipNotificationJob from './membershipNotification.job.js'

// Export tất cả jobs
export { NotificationCleanupJob, MembershipNotificationJob }

// Function để start tất cả jobs (async để phù hợp với server startup)
export const startAllJobs = async () => {
  try {
    console.log('Starting all scheduled jobs...')

    // Start notification cleanup job
    NotificationCleanupJob.startCleanupJob()

    // Start membership notification jobs
    MembershipNotificationJob.startMembershipExpiringJob()
    MembershipNotificationJob.startMembershipExpiredJob()

    console.log('All jobs started successfully')
  } catch (error) {
    console.error('Error starting jobs:', error)
    throw error
  }
}
