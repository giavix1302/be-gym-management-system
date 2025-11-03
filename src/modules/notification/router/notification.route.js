import express from 'express'
import { notificationController } from '../controller/notification.controller'

const Router = express.Router()

// Basic CRUD routes
Router.route('/').post(notificationController.createNotification) // Tạo notification đơn lẻ

Router.route('/bulk').post(notificationController.createBulkNotifications) // Tạo nhiều notifications cùng lúc

Router.route('/user/:userId').get(notificationController.getUserNotifications) // Lấy notifications của user

Router.route('/user/:userId/unread-count').get(notificationController.getUnreadCount) // Lấy số lượng notification chưa đọc

Router.route('/user/:userId/mark-all-read').patch(notificationController.markAllAsRead) // Đánh dấu tất cả là đã đọc

Router.route('/:notificationId/read').patch(notificationController.markAsRead) // Đánh dấu 1 notification là đã đọc

Router.route('/:notificationId').delete(notificationController.deleteNotification) // Xóa 1 notification

// Helper routes for specific notification types
Router.route('/membership-expiring').post(notificationController.createMembershipExpiringNotification) // Tạo thông báo hết hạn membership

Router.route('/booking-reminder').post(notificationController.createBookingReminderNotification) // Tạo thông báo nhắc nhở booking

Router.route('/class-reminder').post(notificationController.createClassReminderNotification) // Tạo thông báo nhắc nhở lớp học

// Admin routes
Router.route('/admin/cleanup').delete(notificationController.cleanupOldNotifications) // Cleanup notifications cũ

export const notificationRoute = Router
