// action/action.coordinator.js - Coordinates all action services

import { membershipService } from './membership.service.js'
import { bookingService } from './booking.service.js'
import { registrationService } from './registration.service.js'
import { cancellationService } from './cancellation.service.js'

// Error response helpers
const getUnsupportedActionResponse = (specificIntent) => {
  const actionLabels = {
    register_membership: 'đăng ký gói tập',
    register_class: 'đăng ký lớp học',
    check_membership: 'kiểm tra gói tập',
    check_schedule: 'xem lịch cá nhân',
    book_trainer: 'đặt lịch trainer',
    cancel_booking: 'hủy lịch hẹn',
    contact_staff: 'liên hệ staff',
    register_account: 'đăng ký tài khoản',
  }

  const actionLabel = actionLabels[specificIntent] || 'thực hiện hành động này'

  return {
    content: `Tính năng "${actionLabel}" đang được phát triển.\n\nHiện tại bạn có thể:\n• Hỏi thông tin gym\n• Xem các gói membership\n• Tìm hiểu về lớp học\n\nVui lòng liên hệ staff để được hỗ trợ trực tiếp!`,
    type: 'unsupported_action',
    action: specificIntent,
  }
}

const getActionErrorResponse = (action, errorMessage) => {
  return {
    content: `Xin lỗi, đã xảy ra lỗi khi thực hiện "${action}".\n\nVui lòng thử lại sau hoặc liên hệ staff để được hỗ trợ!`,
    type: 'action_error',
    action,
    error: errorMessage,
  }
}

// Main action handler - coordinates between different service modules
export const handleAction = async (specificIntent, entities, userId) => {
  try {
    switch (specificIntent) {
      // Registration actions
      case 'register_account':
        return await registrationService.handleRegisterAccount(entities, userId)

      case 'contact_staff':
        return await registrationService.handleContactStaff(entities, userId)

      // Membership actions
      case 'register_membership':
        return await membershipService.handleRegisterMembership(entities, userId)

      case 'check_membership':
        return await membershipService.handleCheckMembership(userId)

      // Booking actions
      case 'register_class':
        return await bookingService.handleRegisterClass(entities, userId)

      case 'book_trainer':
        return await bookingService.handleBookTrainer(entities, userId)

      case 'check_schedule':
        return await bookingService.handleCheckSchedule(entities, userId)

      // Cancellation actions
      case 'cancel_booking':
        return await cancellationService.handleCancelBooking(entities, userId)

      default:
        return getUnsupportedActionResponse(specificIntent)
    }
  } catch (error) {
    console.error('Action coordinator error:', error)
    return getActionErrorResponse(specificIntent, error.message)
  }
}

// Export for backward compatibility
export default {
  handleAction,
}
