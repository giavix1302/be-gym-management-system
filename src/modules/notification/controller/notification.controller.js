import { StatusCodes } from 'http-status-codes'
import { notificationService } from '../service/notification.service'

const createNotification = async (req, res, next) => {
  try {
    const result = await notificationService.createNotification(req.body)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const createBulkNotifications = async (req, res, next) => {
  try {
    const { notifications } = req.body
    const result = await notificationService.createBulkNotifications(notifications)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getUserNotifications = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { page, limit, unreadOnly, type } = req.query

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      unreadOnly: unreadOnly === 'true',
      type: type || null,
    }

    const result = await notificationService.getUserNotifications(userId, options)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getUnreadCount = async (req, res, next) => {
  try {
    const { userId } = req.params
    const result = await notificationService.getUnreadCount(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params
    const result = await notificationService.markAsRead(notificationId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const markAllAsRead = async (req, res, next) => {
  try {
    const { userId } = req.params
    const result = await notificationService.markAllAsRead(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params
    const result = await notificationService.deleteNotification(notificationId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// Helper endpoints for specific notification types
const createMembershipExpiringNotification = async (req, res, next) => {
  try {
    const { userId, subscriptionId, membershipName, expiryDate } = req.body
    const result = await notificationService.createMembershipExpiringNotification(
      userId,
      subscriptionId,
      membershipName,
      expiryDate
    )

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const createBookingReminderNotification = async (req, res, next) => {
  try {
    const { userId, bookingId, bookingTitle, startTime, isTrainer } = req.body
    const result = await notificationService.createBookingReminderNotification(
      userId,
      bookingId,
      bookingTitle,
      startTime,
      isTrainer
    )

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const createClassReminderNotification = async (req, res, next) => {
  try {
    const { userId, classSessionId, className, startTime, roomName, isTrainer } = req.body
    const result = await notificationService.createClassReminderNotification(
      userId,
      classSessionId,
      className,
      startTime,
      roomName,
      isTrainer
    )

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// Admin endpoint để cleanup notifications cũ
const cleanupOldNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.cleanupOldNotifications()

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const notificationController = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,

  // Helper controllers
  createMembershipExpiringNotification,
  createBookingReminderNotification,
  createClassReminderNotification,
  cleanupOldNotifications,
}
