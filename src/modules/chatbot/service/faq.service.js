// faq.service.js - Simple FAQ service with database integration - NO FALLBACK DATA

import { classModel } from '~/modules/class/model/class.model.js'
import { locationModel } from '~/modules/location/model/location.model.js'
import { membershipModel } from '~/modules/membership/model/membership.model.js'
import { trainerModel } from '~/modules/trainer/model/trainer.model.js'
import { formatPrice } from '~/utils/utils.js'

// Main FAQ handler
export const handleFAQ = async (message, userId = null) => {
  try {
    // Import intent classifier
    const { classifyIntent } = await import('./intent.classifier.js')

    const classification = classifyIntent(message)
    const { specificIntent, faqCategory } = classification

    console.log('FAQ Classification:', classification)

    let response = null

    switch (specificIntent) {
      case 'general_question':
        response = handleGeneralQuestion(message)
        break

      case 'gym_locations':
        response = await handleLocations()
        break

      case 'gym_memberships':
        response = await handleMemberships()
        break

      case 'gym_classes':
        response = await handleClasses()
        break

      case 'gym_trainers':
        response = await handleTrainers()
        break

      case 'gym_equipment':
        response = await handleEquipment()
        break

      case 'basic_info':
        response = handleBasicInfo(message)
        break

      default:
        response = handleUnknown()
    }

    return response
  } catch (error) {
    console.error('FAQ handler error:', error)
    return {
      content: 'Xin lỗi, đã xảy ra lỗi hệ thống. Vui lòng thử lại sau!\n\n📞 Liên hệ: 1900-1234',
      type: 'error',
    }
  }
}

// 1. General questions (non-gym)
const handleGeneralQuestion = (message) => {
  const messageLower = message.toLowerCase()

  if (messageLower.includes('mấy giờ') || messageLower.includes('bây giờ')) {
    const now = new Date()
    const timeString = now.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    return {
      content: `⏰ Hiện tại là ${timeString}`,
      type: 'time_response',
    }
  }

  if (messageLower.includes('cảm ơn') || messageLower.includes('thank')) {
    return {
      content: '😊 Không có gì! Tôi luôn sẵn sàng hỗ trợ bạn!',
      type: 'thanks_response',
    }
  }

  if (messageLower.includes('chào') || messageLower.includes('hello') || messageLower.includes('hi')) {
    return {
      content: '👋 Chào bạn! Tôi là trợ lý AI của THE GYM. Bạn cần hỗ trợ gì?',
      type: 'greeting_response',
    }
  }

  return {
    content: '🤖 Tôi chuyên hỗ trợ thông tin về THE GYM. Bạn có câu hỏi gì về phòng tập không?',
    type: 'general_response',
  }
}

// 2. Gym locations from database
const handleLocations = async () => {
  try {
    const locations = await locationModel.getListLocation()

    if (!locations || locations.length === 0) {
      return {
        content: 'Hiện tại không có thông tin cơ sở nào. Vui lòng liên hệ staff!\n\n📞 Hotline: 1900-1234',
        type: 'no_locations_error',
      }
    }

    const count = locations.length
    const firstThree = locations.slice(0, 3)

    let content = `🏢 THE GYM có ${count} cơ sở:\n\n`

    firstThree.forEach((location, index) => {
      content += `${index + 1}. ${location.name}\n`
      if (location.address?.full) {
        content += `   📍 ${location.address.full}\n`
      }
      content += '\n'
    })

    if (count > 3) {
      content += `💡 Đăng nhập để xem ${count - 3} cơ sở còn lại!\n\n`
    }

    content += '📞 Hotline: 1900-1234'

    return {
      content,
      type: 'locations_info',
      data: { count, locations: firstThree },
    }
  } catch (error) {
    console.error('Get locations error:', error)
    return {
      content: 'Xin lỗi, có lỗi khi tải thông tin cơ sở. Vui lòng thử lại sau!\n\n📞 Liên hệ: 1900-1234',
      type: 'locations_error',
    }
  }
}

// 3. Memberships from database
const handleMemberships = async () => {
  try {
    const memberships = await membershipModel.getListWithQuantityUser()

    if (!memberships || memberships.length === 0) {
      return {
        content: 'Hiện tại không có gói membership nào. Vui lòng liên hệ staff!\n\n📞 Hotline: 1900-1234',
        type: 'no_memberships_error',
      }
    }

    const count = memberships.length

    let content = `💪 THE GYM có ${count} gói membership:\n\n`

    memberships.slice(0, 3).forEach((membership, index) => {
      content += `${index + 1}. ${membership.name}\n`
      content += `   💰 ${formatPrice(membership.price)}/${membership.durationMonth} tháng\n`
      if (membership.discount > 0) {
        content += `   🎉 Giảm ${membership.discount}%\n`
      }
      content += '\n'
    })

    if (count > 3) {
      content += `💡 Đăng nhập để xem chi tiết ${count - 3} gói còn lại!\n\n`
    }

    content += '📞 Tư vấn: 1900-1234'

    return {
      content,
      type: 'memberships_info',
      data: { count, memberships: memberships.slice(0, 3) },
    }
  } catch (error) {
    console.error('Get memberships error:', error)
    return {
      content: 'Xin lỗi, có lỗi khi tải thông tin gói membership. Vui lòng thử lại sau!\n\n📞 Liên hệ: 1900-1234',
      type: 'memberships_error',
    }
  }
}

// 4. Classes from database - FIXED: Handle direct array response
const handleClasses = async () => {
  try {
    const response = await classModel.getList()
    console.log('🛠 Raw response from DB:', JSON.stringify(response, null, 2))

    // ✅ FIXED: Response is direct array, not object with classes property
    if (!response || !Array.isArray(response) || response.length === 0) {
      return {
        content:
          'Hiện tại không có lớp học nào. Vui lòng liên hệ staff để biết thêm thông tin!\n\n📞 Hotline: 1900-1234',
        type: 'no_classes_error',
      }
    }

    const classes = response // ✅ FIXED: Direct array
    const total = classes.length

    console.log('🛠 Found', total, 'classes from database')

    let content = `🏃‍♀️ THE GYM có ${total} lớp học:\n\n`

    // Show first 4 classes
    classes.slice(0, 4).forEach((classItem, index) => {
      content += `${index + 1}. ${classItem.name}\n`

      if (classItem.classType) {
        content += `   🎯 Loại: ${getClassTypeDisplayName(classItem.classType)}\n`
      }

      if (classItem.description) {
        content += `   📝 ${classItem.description}\n`
      }

      if (classItem.price) {
        content += `   💰 ${formatPrice(classItem.price)}\n`
      }

      if (classItem.capacity) {
        content += `   👥 Sức chứa: ${classItem.capacity} người\n`
      }

      // Parse recurrence for schedule
      if (classItem.recurrence && classItem.recurrence.length > 0) {
        const schedule = parseRecurrenceToSchedule(classItem.recurrence)
        content += `   📅 ${schedule}\n`
      }

      content += '\n'
    })

    if (total > 4) {
      content += `💡 Đăng nhập để xem ${total - 4} lớp còn lại!\n\n`
    }

    content += '📞 Đăng ký: 1900-1234'

    return {
      content,
      type: 'classes_info',
      data: {
        totalClasses: total,
        classes: classes.slice(0, 4),
      },
    }
  } catch (error) {
    console.error('🛠 Get classes error:', error)
    return {
      content: 'Xin lỗi, có lỗi khi tải thông tin lớp học. Vui lòng thử lại sau!\n\n📞 Liên hệ: 1900-1234',
      type: 'classes_error',
    }
  }
}

// 5. Trainers from database
const handleTrainers = async () => {
  try {
    const trainers = await trainerModel.getListTrainerForUser()

    if (!trainers || trainers.length === 0) {
      return {
        content: 'Hiện tại không có trainer nào. Vui lòng liên hệ staff!\n\n📞 Hotline: 1900-1234',
        type: 'no_trainers_error',
      }
    }

    const count = trainers.length

    let content = `👨‍💪 THE GYM có ${count} trainer:\n\n`

    trainers.slice(0, 3).forEach((trainer, index) => {
      content += `${index + 1}. ${trainer.fullName || 'Trainer'}\n`
      if (trainer.specialization?.length > 0) {
        content += `   🎯 ${trainer.specialization.slice(0, 2).join(', ')}\n`
      }
      if (trainer.experience) {
        content += `   📈 ${trainer.experience} năm kinh nghiệm\n`
      }
      content += '\n'
    })

    if (count > 3) {
      content += `💡 Đăng nhập để xem ${count - 3} trainer còn lại!\n\n`
    }

    content += '📞 Đặt lịch: 1900-1234'

    return {
      content,
      type: 'trainers_info',
      data: { count, trainers: trainers.slice(0, 3) },
    }
  } catch (error) {
    console.error('Get trainers error:', error)
    return {
      content: 'Xin lỗi, có lỗi khi tải thông tin trainer. Vui lòng thử lại sau!\n\n📞 Liên hệ: 1900-1234',
      type: 'trainers_error',
    }
  }
}

// 6. Equipment - enhanced with quantity info
const handleEquipment = async (message) => {
  return {
    content: `🏋️ THIẾT BỊ THE GYM:\n\n📍 Ở mỗi cơ sở sẽ có nhiều loại thiết bị khác nhau.\n\nBạn hãy đăng nhập và vào mục hệ thống phòng tập để xem từng thiết bị nhé!\n\n📞 Hỗ trợ: 1900-1234`,
    type: 'equipment_info',
  }
}

// 7. Basic info
const handleBasicInfo = (message) => {
  if (message.includes('mở cửa') || message.includes('giờ')) {
    return {
      content: '⏰ GIỜ MỞ CỬA:\n\n📅 Thứ 2 - Chủ nhật\n🕕 06:00 - 22:00\n\n📞 Hotline: 1900-1234',
      type: 'hours_info',
    }
  }

  if (message.includes('liên hệ') || message.includes('hotline')) {
    return {
      content:
        '📞 LIÊN HỆ THE GYM:\n\n📱 Hotline: 1900-1234\n📧 Email: info@thegym.vn\n🌐 Website: www.thegym.vn\n📍 Địa chỉ: Xem danh sách cơ sở',
      type: 'contact_info',
    }
  }

  return {
    content:
      '🏋️ THE GYM - Phòng tập hiện đại\n\n⏰ Mở cửa: 06:00-22:00\n📞 Hotline: 1900-1234\n💪 Tập luyện chuyên nghiệp!',
    type: 'basic_info',
  }
}

const handleUnknown = () => {
  return {
    content:
      '🤔 Tôi chưa hiểu câu hỏi của bạn.\n\nBạn có thể hỏi về:\n• Cơ sở gym\n• Gói membership\n• Lớp học\n• Trainer\n• Thiết bị\n• Giờ mở cửa\n\nHoặc nói "xin chào" để bắt đầu!',
    type: 'unknown',
  }
}

// Helper function to get display name for class types
const getClassTypeDisplayName = (type) => {
  const typeMap = {
    yoga: 'Yoga',
    dance: 'Dance',
    boxing: 'Boxing',
    cardio: 'Cardio',
    strength: 'Strength Training',
    aerobic: 'Aerobic',
    pilates: 'Pilates',
    zumba: 'Zumba',
    crossfit: 'CrossFit',
    spinning: 'Spinning',
    other: 'Khác',
  }
  return typeMap[type.toLowerCase()] || type
}

// Helper function to parse recurrence to readable schedule
const parseRecurrenceToSchedule = (recurrence) => {
  if (!recurrence || recurrence.length === 0) return ''

  const dayNames = {
    0: 'Chủ nhật',
    1: 'Thứ 2',
    2: 'Thứ 3',
    3: 'Thứ 4',
    4: 'Thứ 5',
    5: 'Thứ 6',
    6: 'Thứ 7',
  }

  const schedules = recurrence.map((rec) => {
    const day = dayNames[rec.dayOfWeek] || `Ngày ${rec.dayOfWeek}`
    const startTime = `${rec.startTime.hour}:${rec.startTime.minute.toString().padStart(2, '0')}`
    const endTime = `${rec.endTime.hour}:${rec.endTime.minute.toString().padStart(2, '0')}`
    return `${day}: ${startTime}-${endTime}`
  })

  return schedules.join(', ')
}

export default { handleFAQ }
