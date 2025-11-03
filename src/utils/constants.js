export const USER_TYPES = {
  USER: 'user',
  ADMIN: 'admin',
  PT: 'pt',
  STAFF: 'staff',
}

export const GENDER_TYPE = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
}

export const STATUS_TYPE = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
}

export const MEMBERSHIP_TYPE = {
  GYM: 'gym',
  YOGA: 'yoga',
  BOXING: 'boxing',
}

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
}

export const EQUIPMENT_STATUS = {
  ACTIVE: 'active',
  MAINTENANCE: 'maintenance',
  BROKEN: 'broken',
}

export const BOOKING_STATUS = {
  PENDING: 'pending',
  BOOKING: 'booking',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const ATTENDANCE_METHOD = {
  QRCODE: 'qrCode',
  FACE: 'face',
}

export const PAYMENT_TYPE = {
  MEMBERSHIP: 'membership',
  BOOKING: 'booking',
  CLASS: 'class',
}

export const PAYMENT_METHOD = {
  CASH: 'cash',
  BANK: 'bank',
  MOMO: 'momo',
  VNPAY: 'vnpay',
}

export const PAYMENT_STATUS = {
  PAID: 'paid',
  UNPAID: 'unpaid',
}

export const APPROVED_TYPE = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export const SPECIALIZATION_TYPE = {
  GYM: 'gym',
  BOXING: 'boxing',
  YOGA: 'yoga',
  DANCE: 'dance',
}

export const CLASS_TYPE = {
  BOXING: 'boxing',
  YOGA: 'yoga',
  DANCE: 'dance',
}

export const CLASS_ENROLLMENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const EQUIPMENT_MUSCLE_CATEGORIES = {
  // Nhóm cơ trên cơ thể
  CHEST: 'chest', // Ngực
  SHOULDERS: 'shoulders', // Vai
  ARMS: 'arms', // Cánh tay (tay trước, tay sau)
  BICEPS: 'biceps', // Tay trước
  TRICEPS: 'triceps', // Tay sau
  BACK: 'back', // Lưng
  LATS: 'lats', // Cánh tay rộng

  // Nhóm cơ core
  ABS: 'abs', // Bụng
  CORE: 'core', // Cơ core tổng thể
  OBLIQUES: 'obliques', // Cơ bụng chéo

  // Nhóm cơ dưới cơ thể
  LEGS: 'legs', // Chân tổng thể
  QUADRICEPS: 'quadriceps', // Đùi trước
  HAMSTRINGS: 'hamstrings', // Đùi sau
  GLUTES: 'glutes', // Mông
  CALVES: 'calves', // Bắp chân

  // Toàn thân
  FULL_BODY: 'full_body', // Toàn thân
  CARDIO: 'cardio', // Tim mạch

  // Nhóm cơ khác
  FOREARMS: 'forearms', // Cẳng tay
  NECK: 'neck', // Cổ
  FLEXIBILITY: 'flexibility', // Độ dẻo dai
}

export const MUSCLE_CATEGORY_LABELS = {
  [EQUIPMENT_MUSCLE_CATEGORIES.CHEST]: 'Ngực',
  [EQUIPMENT_MUSCLE_CATEGORIES.SHOULDERS]: 'Vai',
  [EQUIPMENT_MUSCLE_CATEGORIES.ARMS]: 'Cánh tay',
  [EQUIPMENT_MUSCLE_CATEGORIES.BICEPS]: 'Tay trước (Biceps)',
  [EQUIPMENT_MUSCLE_CATEGORIES.TRICEPS]: 'Tay sau (Triceps)',
  [EQUIPMENT_MUSCLE_CATEGORIES.BACK]: 'Lưng',
  [EQUIPMENT_MUSCLE_CATEGORIES.LATS]: 'Cánh tay rộng (Lats)',
  [EQUIPMENT_MUSCLE_CATEGORIES.ABS]: 'Bụng',
  [EQUIPMENT_MUSCLE_CATEGORIES.CORE]: 'Cơ core',
  [EQUIPMENT_MUSCLE_CATEGORIES.OBLIQUES]: 'Cơ bụng chéo',
  [EQUIPMENT_MUSCLE_CATEGORIES.LEGS]: 'Chân',
  [EQUIPMENT_MUSCLE_CATEGORIES.QUADRICEPS]: 'Đùi trước',
  [EQUIPMENT_MUSCLE_CATEGORIES.HAMSTRINGS]: 'Đùi sau',
  [EQUIPMENT_MUSCLE_CATEGORIES.GLUTES]: 'Mông',
  [EQUIPMENT_MUSCLE_CATEGORIES.CALVES]: 'Bắp chân',
  [EQUIPMENT_MUSCLE_CATEGORIES.FULL_BODY]: 'Toàn thân',
  [EQUIPMENT_MUSCLE_CATEGORIES.CARDIO]: 'Tim mạch',
  [EQUIPMENT_MUSCLE_CATEGORIES.FOREARMS]: 'Cẳng tay',
  [EQUIPMENT_MUSCLE_CATEGORIES.NECK]: 'Cổ',
  [EQUIPMENT_MUSCLE_CATEGORIES.FLEXIBILITY]: 'Độ dẻo dai',
}

export const NOTIFICATION_TYPE = {
  USER_MEMBERSHIP_EXPIRING: 'USER_MEMBERSHIP_EXPIRING',
  USER_UPCOMING_CLASS_SESSION: 'USER_UPCOMING_CLASS_SESSION',
  USER_UPCOMING_BOOKING: 'USER_UPCOMING_BOOKING',
  TRAINER_UPCOMING_CLASS_SESSION: 'TRAINER_UPCOMING_CLASS_SESSION',
  TRAINER_UPCOMING_BOOKING: 'TRAINER_UPCOMING_BOOKING',
}

export const REFERENCE_TYPE = {
  BOOKING: 'BOOKING',
  CLASS: 'CLASS',
  MEMBERSHIP: 'MEMBERSHIP',
}

export const STAFF_TYPE = {
  RECEPTIONIST: 'receptionist',
  CLEANER: 'cleaner',
}
