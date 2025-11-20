import { notificationModel } from '../model/notification.model'
import { sanitize } from '~/utils/utils'
import { NOTIFICATION_CONFIG, getMembershipExpiringMessage } from './notification.config'

const createNotification = async (notificationData) => {
  try {
    // Kiểm tra duplicate notification trong 30 phút gần đây
    const isDuplicate = await notificationModel.checkDuplicateNotification(
      notificationData.userId,
      notificationData.type,
      notificationData.referenceId,
      30
    )

    if (isDuplicate) {
      return {
        success: false,
        message: 'Notification already exists within the time window',
      }
    }

    const result = await notificationModel.createNew(notificationData)
    const newNotification = await notificationModel.getDetailById(result.insertedId)

    return {
      success: true,
      message: 'Notification created successfully',
      notification: sanitize(newNotification),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const createBulkNotifications = async (notifications) => {
  try {
    // Filter out duplicates
    const uniqueNotifications = []

    for (const notification of notifications) {
      const isDuplicate = await notificationModel.checkDuplicateNotification(
        notification.userId,
        notification.type,
        notification.referenceId,
        30
      )

      if (!isDuplicate) {
        uniqueNotifications.push(notification)
      }
    }

    if (uniqueNotifications.length === 0) {
      return {
        success: false,
        message: 'All notifications already exist within the time window',
      }
    }

    const result = await notificationModel.createBulk(uniqueNotifications)

    return {
      success: true,
      message: `${result.insertedCount} notifications created successfully`,
      insertedCount: result.insertedCount,
      totalAttempted: notifications.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getUserNotifications = async (userId, options = {}) => {
  try {
    const notifications = await notificationModel.getUserNotifications(userId, options)
    const unreadCount = await notificationModel.getUnreadCount(userId)

    return {
      success: true,
      message: 'Notifications retrieved successfully',
      notifications: notifications.map((notification) => sanitize(notification)),
      unreadCount,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 20,
        total: notifications.length,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getUnreadCount = async (userId) => {
  try {
    const count = await notificationModel.getUnreadCount(userId)

    return {
      success: true,
      message: 'Unread count retrieved successfully',
      count,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const markAsRead = async (notificationId) => {
  try {
    const notification = await notificationModel.getDetailById(notificationId)
    if (!notification) {
      return {
        success: false,
        message: 'Notification not found',
      }
    }

    const result = await notificationModel.markAsRead(notificationId)

    return {
      success: true,
      message: 'Notification marked as read successfully',
      notification: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const markAllAsRead = async (userId) => {
  try {
    const result = await notificationModel.markAllAsRead(userId)

    return {
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteNotification = async (notificationId) => {
  try {
    const notification = await notificationModel.getDetailById(notificationId)
    if (!notification) {
      return {
        success: false,
        message: 'Notification not found',
      }
    }

    const result = await notificationModel.deleteNotification(notificationId)

    return {
      success: true,
      message: 'Notification deleted successfully',
      notification: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Xóa notifications theo reference (dùng khi user hủy subscription, booking, etc.)
const deleteNotificationsByReference = async (referenceId, referenceType) => {
  try {
    const result = await notificationModel.deleteNotificationsByReference(referenceId, referenceType)

    return {
      success: true,
      message: `${result.modifiedCount} notifications deleted`,
      deletedCount: result.modifiedCount,
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Service helper functions để tạo notifications cho các use case cụ thể
const createMembershipExpiringNotification = async (userId, subscriptionId, membershipName, expiryDate, daysLeft) => {
  try {
    const message = getMembershipExpiringMessage(membershipName, daysLeft)

    const notificationData = {
      userId,
      referenceId: subscriptionId,
      referenceType: 'MEMBERSHIP',
      type: 'USER_MEMBERSHIP_EXPIRING',
      title: 'Gói tập sắp hết hạn',
      message,
      isRead: false,
      scheduledAt: Date.now(),
      sentAt: Date.now(),
    }

    return await createNotification(notificationData)
  } catch (error) {
    throw new Error(error)
  }
}

const createMembershipExpiredNotification = async (userId, subscriptionId, membershipName) => {
  try {
    const message = NOTIFICATION_CONFIG.MEMBERSHIP_EXPIRED.MESSAGE.replace('Gói tập', `Gói ${membershipName}`)

    const notificationData = {
      userId,
      referenceId: subscriptionId,
      referenceType: 'MEMBERSHIP',
      type: 'USER_MEMBERSHIP_EXPIRING', // Sử dụng cùng type, phân biệt bằng message
      title: 'Gói tập đã hết hạn',
      message,
      isRead: false,
      scheduledAt: Date.now(),
      sentAt: Date.now(),
    }

    return await createNotification(notificationData)
  } catch (error) {
    throw new Error(error)
  }
}

// ✅ 1. SỬA HÀM NÀY - THÊM CHECK DUPLICATE
const createBookingReminderNotification = async (
  userId,
  bookingId,
  bookingTitle,
  startTime,
  isTrainer = false,
  additionalInfo = {}
) => {
  try {
    const config = NOTIFICATION_CONFIG.BOOKING_REMINDER
    const type = isTrainer ? 'TRAINER_UPCOMING_BOOKING' : 'USER_UPCOMING_BOOKING'

    // ✅ THÊM: Kiểm tra đã tồn tại chưa (không giới hạn thời gian)
    const alreadyExists = await notificationModel.checkDuplicateNotification(
      userId,
      type,
      bookingId,
      null // null = không giới hạn thời gian
    )

    if (alreadyExists) {
      console.log(
        `⚠️ Booking reminder already exists - User: ${userId}, Booking: ${bookingId}, isTrainer: ${isTrainer}`
      )
      return {
        success: false,
        message: 'Booking reminder notification already exists',
        reason: 'ALREADY_EXISTS',
      }
    }
    // ✅ KẾT THÚC THÊM

    const title = isTrainer ? 'Buổi dạy sắp tới' : 'Buổi tập sắp tới'

    let message
    if (isTrainer) {
      const { userName, locationName } = additionalInfo
      message = `${config.TRAINER_MESSAGE} với ${userName} tại ${locationName}`
    } else {
      const { trainerName, locationName } = additionalInfo
      message = `${config.USER_MESSAGE} với PT ${trainerName} tại ${locationName}`
    }

    const notificationData = {
      userId,
      referenceId: bookingId,
      referenceType: 'BOOKING',
      type,
      title,
      message,
      isRead: false,
      scheduledAt: Date.now(),
      sentAt: Date.now(),
    }

    return await createNotification(notificationData)
  } catch (error) {
    throw new Error(error)
  }
}

// ✅ 2. SỬA HÀM NÀY NỮA - THÊM CHECK DUPLICATE
const createClassReminderNotification = async (
  userId,
  classSessionId,
  className,
  startTime,
  roomName,
  isTrainer = false,
  additionalInfo = {}
) => {
  try {
    const config = NOTIFICATION_CONFIG.CLASS_SESSION_REMINDER
    const type = isTrainer ? 'TRAINER_UPCOMING_CLASS_SESSION' : 'USER_UPCOMING_CLASS_SESSION'

    // ✅ THÊM: Kiểm tra đã tồn tại chưa (không giới hạn thời gian)
    const alreadyExists = await notificationModel.checkDuplicateNotification(
      userId,
      type,
      classSessionId,
      null // null = không giới hạn thời gian
    )

    if (alreadyExists) {
      console.log(
        `⚠️ Class reminder already exists - User: ${userId}, ClassSession: ${classSessionId}, isTrainer: ${isTrainer}`
      )
      return {
        success: false,
        message: 'Class reminder notification already exists',
        reason: 'ALREADY_EXISTS',
      }
    }
    // ✅ KẾT THÚC THÊM

    const title = isTrainer ? 'Giờ dạy sắp tới' : 'Lớp học sắp tới'

    let message
    if (isTrainer) {
      const { totalUsers, locationName } = additionalInfo
      message = `${config.TRAINER_MESSAGE} "${className}" với ${totalUsers} học viên tại ${roomName} - ${locationName}`
    } else {
      const { locationName } = additionalInfo
      message = `${config.USER_MESSAGE} "${className}" tại ${roomName} - ${locationName}`
    }

    const notificationData = {
      userId,
      referenceId: classSessionId,
      referenceType: 'CLASS',
      type,
      title,
      message,
      isRead: false,
      scheduledAt: Date.now(),
      sentAt: Date.now(),
    }

    return await createNotification(notificationData)
  } catch (error) {
    throw new Error(error)
  }
}

// Cleanup old notifications (dùng cho cron job)
const cleanupOldNotifications = async () => {
  try {
    const deletedCount = await notificationModel.deleteOldNotifications()

    return {
      success: true,
      message: `${deletedCount} old notifications cleaned up`,
      deletedCount,
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Utility function
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('vi-VN')
}

export const notificationService = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteNotificationsByReference,

  // Helper functions
  createMembershipExpiringNotification,
  createMembershipExpiredNotification,
  createBookingReminderNotification,
  createClassReminderNotification,
  cleanupOldNotifications,
}
