// intent.classifier.js - Simple Intent Classification for Gym Chatbot

// Main classification function
export const classifyIntent = (message) => {
  const messageLower = message.toLowerCase().trim()

  // 1. General questions (non-gym related)
  if (isGeneralQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'general_question',
      faqCategory: 'general',
      confidence: 0.9,
    }
  }

  // 2. Gym Locations
  if (isLocationQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_locations',
      faqCategory: 'locations',
      confidence: 0.8,
    }
  }

  // 3. Memberships
  if (isMembershipQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_memberships',
      faqCategory: 'memberships',
      confidence: 0.8,
    }
  }

  // 4. Classes
  if (isClassQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_classes',
      faqCategory: 'classes',
      confidence: 0.8,
    }
  }

  // 5. Trainers
  if (isTrainerQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_trainers',
      faqCategory: 'trainers',
      confidence: 0.8,
    }
  }

  // 6. Equipment
  if (isEquipmentQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_equipment',
      faqCategory: 'equipment',
      confidence: 0.8,
    }
  }

  // 7. Basic gym info (operating hours, contact)
  if (isBasicInfoQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'basic_info',
      faqCategory: 'basic',
      confidence: 0.8,
    }
  }

  // 8. Personal actions (require login)
  if (isPersonalAction(messageLower)) {
    return {
      category: 'ACTION',
      specificIntent: 'requires_login',
      faqCategory: null,
      confidence: 0.7,
    }
  }

  // Default: general question
  return {
    category: 'FAQ',
    specificIntent: 'general_question',
    faqCategory: 'general',
    confidence: 0.5,
  }
}

// Helper functions for classification
const isGeneralQuestion = (message) => {
  // Skip if contains gym-related keywords first
  if (
    message.includes('gói') ||
    message.includes('membership') ||
    message.includes('cơ sở') ||
    message.includes('lớp') ||
    message.includes('trainer') ||
    message.includes('thiết bị')
  ) {
    return false
  }

  const patterns = [
    'mấy giờ',
    'bây giờ',
    'giờ hiện tại',
    'hôm nay',
    'thứ mấy',
    'ngày mấy',
    'thời tiết',
    'trời',
    'cảm ơn',
    'thank',
    'xin lỗi',
    'sorry',
    'chào',
    'hello',
    'hi',
    'bye',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isLocationQuestion = (message) => {
  const patterns = [
    // Specific location phrases (check first)
    'có mấy cơ sở',
    'bao nhiêu cơ sở',
    'có những cơ sở nào',
    'các cơ sở',
    'những cơ sở',
    'danh sách cơ sở',
    'có mấy chi nhánh',
    'bao nhiêu chi nhánh',
    'các chi nhánh',
    'những chi nhánh',
    'chi nhánh nào',

    // Location-specific words
    'cơ sở',
    'chi nhánh',
    'địa chỉ',
    'ở đâu',
    'quận',
    'huyện',
    'location',

    // Address patterns
    'gym ở đâu',
    'địa chỉ gym',
    'cơ sở gần nhất',
    'chi nhánh gần nhất',
    'gần nhà tôi',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isMembershipQuestion = (message) => {
  const patterns = [
    // Specific membership phrases (check first)
    'các gói membership',
    'những gói membership',
    'danh sách gói membership',
    'có mấy gói',
    'bao nhiêu gói',
    'có những gói nào',
    'gói membership nào',
    'loại gói nào',
    'các gói tập',
    'những gói tập',
    'danh sách gói tập',

    // Membership-related words
    'gói membership',
    'gói tập',
    'gói',
    'membership',

    // Price/fee related
    'phí',
    'giá',
    'chi phí',
    'cost',
    'price',
    'giá gói',
    'phí gói',
    'giá membership',

    // Comparison phrases
    'so sánh gói',
    'gói nào rẻ',
    'gói nào tốt',
    'gói rẻ nhất',
    'gói đắt nhất',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isClassQuestion = (message) => {
  const patterns = [
    // Specific class phrases
    'có lớp gì',
    'lớp nào',
    'có những lớp nào',
    'các lớp',
    'những lớp',
    'danh sách lớp',
    'lớp học nào có sẵn',
    'có những lớp học',
    'các lớp học',
    'những lớp học',
    'lớp học nào',

    // Class types
    'lớp',
    'class',
    'yoga',
    'boxing',
    'dance',
    'aerobic',
    'cardio',
    'zumba',
    'pilates',

    // Class-related phrases
    'môn gì',
    'môn nào',
    'tập được gì',
    'có yoga không',
    'có boxing không',
    'lớp dance',
    'lớp yoga',
    'lớp boxing',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isTrainerQuestion = (message) => {
  const patterns = [
    // Specific trainer phrases
    'có mấy trainer',
    'bao nhiêu trainer',
    'có những trainer nào',
    'các trainer',
    'những trainer',
    'danh sách trainer',
    'trainer nào',
    'pt nào',
    'huấn luyện viên nào',

    // Trainer-related words
    'trainer',
    'pt',
    'huấn luyện viên',
    'coach',

    // Trainer specialization
    'trainer yoga',
    'trainer boxing',
    'pt chuyên',
    'huấn luyện viên giỏi',
    'coach tốt',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isEquipmentQuestion = (message) => {
  const patterns = [
    // Equipment quantity phrases
    'có bao nhiêu thiết bị',
    'mấy thiết bị',
    'bao nhiêu máy',
    'có mấy máy',
    'số lượng thiết bị',
    'thiết bị có bao nhiêu',

    // Equipment general phrases
    'có thiết bị gì',
    'thiết bị nào',
    'có những thiết bị',
    'các thiết bị',
    'những thiết bị',
    'danh sách thiết bị',

    // Equipment words
    'thiết bị',
    'máy',
    'dụng cụ',
    'equipment',

    // Specific equipment
    'tạ',
    'treadmill',
    'bike',
    'máy chạy bộ',
    'xe đạp tập',
    'máy tập',
    'dụng cụ tập',

    // Equipment at gym
    'thiết bị ở phòng tập',
    'máy ở gym',
    'dụng cụ gym',
    'thiết bị phòng gym',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isBasicInfoQuestion = (message) => {
  const patterns = [
    // Operating hours patterns
    'giờ mở cửa gym',
    'gym mở cửa lúc mấy giờ',
    'giờ mở cửa',
    'mở cửa lúc mấy giờ',
    'thời gian mở cửa',
    'giờ hoạt động',
    'thời gian hoạt động',
    'mở cửa',
    'đóng cửa',
    'giờ làm việc',
    'gym mở cửa',
    'phòng gym mở cửa',

    // Contact info patterns
    'liên hệ',
    'hotline',
    'số điện thoại',
    'thông tin liên hệ',
    'contact',
    'email',
    'gmail',
    'website',

    // Policy patterns
    'quy định',
    'chính sách',
    'policy',
    'luật lệ',
    'quy tắc',
    'nội quy',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isPersonalAction = (message) => {
  const patterns = [
    // Personal ownership patterns
    'của tôi',
    'tôi có',
    'tài khoản tôi',
    'gói tôi',
    'lịch tôi',
    'membership tôi',
    'lịch của mình',
    'gói của mình',

    // Registration patterns
    'đăng ký',
    'đăng ký gói',
    'đăng ký lớp',
    'đăng ký membership',
    'register',
    'tạo tài khoản',
    'mở tài khoản',

    // Booking patterns
    'đặt lịch',
    'book',
    'đặt chỗ',
    'đặt lịch trainer',
    'đặt lịch tập',
    'hẹn',
    'thuê trainer',
    'booking',

    // Cancellation patterns
    'hủy',
    'hủy lịch',
    'hủy đăng ký',
    'cancel',
    'hủy booking',

    // Checking patterns
    'kiểm tra',
    'xem',
    'check',
    'kiểm tra gói',
    'xem lịch',
    'xem membership',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

// Function already exported at declaration
