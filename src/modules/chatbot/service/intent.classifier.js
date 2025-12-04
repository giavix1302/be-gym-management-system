// intent.classifier.js - Optimized Intent Classification for Gym Chatbot

// Main classification function - Simplified to 2 main categories: FAQ and PERSONAL
export const classifyIntent = (message) => {
  const messageLower = message.toLowerCase().trim()

  // ✅ FIXED: Check personal info queries FIRST
  if (isPersonalInfoQuestion(messageLower)) {
    return {
      category: 'PERSONAL',
      specificIntent: getSpecificPersonalIntent(messageLower),
      confidence: 0.8,
    }
  }

  // ✅ FIXED: Check membership questions BEFORE general questions
  if (isMembershipQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_memberships',
      faqCategory: 'memberships',
      confidence: 0.8,
    }
  }

  // Check other specific FAQ categories
  if (isLocationQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_locations',
      faqCategory: 'locations',
      confidence: 0.8,
    }
  }

  if (isClassQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_classes',
      faqCategory: 'classes',
      confidence: 0.8,
    }
  }

  if (isTrainerQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_trainers',
      faqCategory: 'trainers',
      confidence: 0.8,
    }
  }

  if (isTechnicalReportQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'technical_report',
      faqCategory: 'technical',
      confidence: 0.9,
    }
  }

  if (isEquipmentQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_equipment',
      faqCategory: 'equipment',
      confidence: 0.8,
    }
  }

  if (isFacilitiesQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'gym_facilities',
      faqCategory: 'facilities',
      confidence: 0.8,
    }
  }

  if (isBasicInfoQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'basic_info',
      faqCategory: 'basic',
      confidence: 0.8,
    }
  }

  // ✅ MOVED: General questions check AFTER specific categories
  if (isGeneralQuestion(messageLower)) {
    return {
      category: 'FAQ',
      specificIntent: 'general_question',
      faqCategory: 'general',
      confidence: 0.9,
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

// Personal info questions (require authentication) - ✅ FIXED
const isPersonalInfoQuestion = (message) => {
  const patterns = [
    // ✅ FIXED: Thêm patterns bị thiếu
    'gói tập của tôi',
    'gói của tôi',
    'gói hiện tại của tôi',
    'gói tập hiện tại của tôi', // ✅ CRITICAL: Pattern này bị thiếu
    'membership của tôi',
    'gói membership của tôi',
    'tôi có gói gì',
    'gói tôi đang dùng',
    'gói tôi đang có',
    'kiểm tra gói tập',
    'xem gói tập',
    'check membership',
    'my membership',

    // My schedule patterns
    'lịch tập của tôi',
    'lịch của tôi',
    'lịch cá nhân',
    'lịch hẹn của tôi',
    'tôi có lịch gì',
    'xem lịch tập',
    'kiểm tra lịch',
    'lịch với trainer',
    'lịch lớp học',
    'my schedule',
    'check schedule',
    'lịch ngày mai',
    'lịch hôm nay',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

// Get specific personal intent - ✅ FIXED
const getSpecificPersonalIntent = (message) => {
  // ✅ FIXED: Membership related - thêm more patterns
  if (
    message.includes('gói tập') ||
    message.includes('gói hiện tại') ||
    message.includes('membership') ||
    message.includes('kiểm tra gói') ||
    message.includes('xem gói') ||
    message.includes('gói của tôi')
  ) {
    return 'my_membership'
  }

  // Schedule related
  if (
    message.includes('lịch') ||
    message.includes('schedule') ||
    message.includes('hẹn') ||
    message.includes('trainer') ||
    message.includes('lớp học')
  ) {
    return 'my_schedule'
  }

  return 'my_membership' // ✅ FIXED: Default to my_membership instead of check_membership
}

// General questions (non-gym related)
const isGeneralQuestion = (message) => {
  // Skip if contains gym-related keywords first
  if (
    message.includes('gói') ||
    message.includes('membership') ||
    message.includes('cơ sở') ||
    message.includes('lớp') ||
    message.includes('trainer') ||
    message.includes('thiết bị') ||
    message.includes('của tôi') ||
    message.includes('gym') ||
    message.includes('phòng tập') ||
    message.includes('mở cửa') ||
    message.includes('đóng cửa') ||
    message.includes('hoạt động') ||
    message.includes('liên hệ') ||
    message.includes('hotline')
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
    '1 + 1',
    'bằng mấy',
    'phép tính',
    'toán học',
    'math',
    'cộng',
    'trừ',
    'nhân',
    'chia',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isLocationQuestion = (message) => {
  const patterns = [
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
    'cơ sở',
    'chi nhánh',
    'địa chỉ',
    'ở đâu',
    'quận',
    'huyện',
    'location',
    'gym ở đâu',
    'địa chỉ gym',
    'cơ sở gần nhất',
    'chi nhánh gần nhất',
    'gần nhà tôi',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isMembershipQuestion = (message) => {
  // Skip personal membership questions
  if (message.includes('của tôi') || message.includes('tôi có') || message.includes('my ')) {
    return false
  }

  const patterns = [
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
    'gói membership', // ✅ FIXED: Thêm pattern này
    'gói tập',
    'gói',
    'membership',
    'phí',
    'giá',
    'chi phí',
    'cost',
    'price',
    'giá gói',
    'phí gói',
    'giá membership',
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
    'lớp',
    'class',
    'yoga',
    'boxing',
    'dance',
    'aerobic',
    'cardio',
    'zumba',
    'pilates',
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
    'có mấy trainer',
    'bao nhiêu trainer',
    'có những trainer nào',
    'các trainer',
    'những trainer',
    'danh sách trainer',
    'trainer nào',
    'pt nào',
    'huấn luyện viên nào',
    'trainer',
    'pt',
    'huấn luyện viên',
    'coach',
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
    'có bao nhiêu thiết bị',
    'mấy thiết bị',
    'bao nhiêu máy',
    'có mấy máy',
    'số lượng thiết bị',
    'thiết bị có bao nhiêu',
    'có thiết bị gì',
    'thiết bị nào',
    'có những thiết bị',
    'các thiết bị',
    'những thiết bị',
    'danh sách thiết bị',
    'thiết bị',
    'máy',
    'dụng cụ',
    'equipment',
    'tạ',
    'treadmill',
    'bike',
    'máy chạy bộ',
    'xe đạp tập',
    'máy tập',
    'dụng cụ tập',
    'thiết bị ở phòng tập',
    'máy ở gym',
    'dụng cụ gym',
    'thiết bị phòng gym',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isTechnicalReportQuestion = (message) => {
  const patterns = [
    'máy bị hư',
    'máy hỏng',
    'thiết bị hỏng',
    'thiết bị bị hư',
    'máy không hoạt động',
    'thiết bị không hoạt động',
    'phản ánh',
    'khiếu nại',
    'báo cáo',
    'report',
    'máy lỗi',
    'thiết bị lỗi',
    'equipment broken',
    'equipment not working',
    'machine broken',
    'machine not working',
    'sự cố',
    'vấn đề thiết bị',
    'máy có vấn đề',
    'thiết bị có vấn đề',
    'góp ý',
    'feedback',
    'complaint',
    'máy không chạy',
    'thiết bị không chạy',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isFacilitiesQuestion = (message) => {
  const patterns = [
    'phòng tắm',
    'tắm nước nóng',
    'nước nóng',
    'có nước nóng',
    'sauna',
    'xông hơi',
    'phòng xông hơi',
    'jacuzzi',
    'bể sục',
    'bể sục nóng',
    'tiện ích',
    'dịch vụ',
    'tủ khóa',
    'thay đồ',
    'phòng thay đồ',
    'vệ sinh',
    'toilet',
    'wc',
    'facilities',
    'amenities',
    'shower',
    'locker',
    'changing room',
    'massage',
    'trị liệu',
    'thư giãn',
    'relax',
    'spa',
    'có gì',
    'dịch vụ gì',
    'tiện ích gì',
    'có những gì',
    'cung cấp gì',
    'hỗ trợ gì',
    'có cung cấp',
    'có hỗ trợ',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

const isBasicInfoQuestion = (message) => {
  const patterns = [
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
    'liên hệ',
    'hotline',
    'số điện thoại',
    'thông tin liên hệ',
    'contact',
    'email',
    'gmail',
    'website',
    'quy định',
    'chính sách',
    'policy',
    'luật lệ',
    'quy tắc',
    'nội quy',
  ]
  return patterns.some((pattern) => message.includes(pattern))
}

// Function already exported at declaration
