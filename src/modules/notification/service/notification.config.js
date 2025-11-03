// Cấu hình thời gian nhắc nhở cho từng loại notification
export const NOTIFICATION_CONFIG = {
  // Membership expiring notifications
  MEMBERSHIP_EXPIRING: {
    // Nhắc nhở trước bao nhiêu ngày
    REMINDER_DAYS: [7, 3, 1], // 7 ngày, 3 ngày, 1 ngày trước khi hết hạn
    // Message templates
    MESSAGES: {
      7: 'Gói tập của bạn sẽ hết hạn trong 7 ngày. Hãy gia hạn để tiếp tục sử dụng dịch vụ!',
      3: 'Gói tập của bạn sẽ hết hạn trong 3 ngày. Vui lòng gia hạn ngay!',
      1: 'Gói tập của bạn sẽ hết hạn vào ngày mai. Gia hạn ngay để không bị gián đoạn!',
    },
  },

  // Booking reminder notifications
  BOOKING_REMINDER: {
    REMINDER_MINUTES: 60, // Nhắc trước 1 giờ
    USER_MESSAGE: 'Còn 1 giờ nữa sẽ đến buổi tập kèm',
    TRAINER_MESSAGE: 'Còn 1 giờ nữa sẽ đến buổi dạy kèm 1 vs 1',
  },

  // Class session reminder notifications
  CLASS_SESSION_REMINDER: {
    REMINDER_MINUTES: 60, // Nhắc trước 1 giờ
    USER_MESSAGE: 'Còn 1 giờ nữa sẽ đến lớp học',
    TRAINER_MESSAGE: 'Còn 1 giờ nữa sẽ đến giờ dạy lớp',
  },

  // Membership expired notification
  MEMBERSHIP_EXPIRED: {
    MESSAGE: 'Gói tập của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng dịch vụ!',
  },
}

// Helper function để lấy message dựa vào số ngày
export const getMembershipExpiringMessage = (membershipName, daysLeft) => {
  const messages = NOTIFICATION_CONFIG.MEMBERSHIP_EXPIRING.MESSAGES

  if (daysLeft >= 7) {
    return messages[7].replace('Gói tập', `Gói ${membershipName}`)
  } else if (daysLeft >= 3) {
    return messages[3].replace('Gói tập', `Gói ${membershipName}`)
  } else if (daysLeft >= 1) {
    return messages[1].replace('Gói tập', `Gói ${membershipName}`)
  }

  return NOTIFICATION_CONFIG.MEMBERSHIP_EXPIRED.MESSAGE.replace('Gói tập', `Gói ${membershipName}`)
}

// Helper function để check xem có cần tạo notification không
export const shouldCreateMembershipNotification = (daysLeft) => {
  return NOTIFICATION_CONFIG.MEMBERSHIP_EXPIRING.REMINDER_DAYS.includes(daysLeft)
}
