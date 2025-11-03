// faq.service.js - FAQ System với Static + Dynamic Data

import { chatbotKnowledgeModel } from '../model/chatbotKnowledge.model.js'
import { gymInfoModel } from '../model/gymInfo.model.js'
import { membershipModel } from '~/modules/membership/model/membership.model.js'
import { classModel } from '~/modules/class/model/class.model.js'
import { trainerModel } from '~/modules/trainer/model/trainer.model.js'
import { equipmentModel } from '~/modules/equipment/model/equipment.model.js'
import { locationModel } from '~/modules/location/model/location.model.js'
import { initializeGeminiClient } from '~/config/chatbot.config.js'

// Category Detection Map
const CATEGORY_KEYWORDS = {
  membership: ['gói', 'membership', 'thành viên', 'phí', 'giá', 'chi phí', 'package'],
  classes: ['lớp', 'class', 'yoga', 'boxing', 'dance', 'học', 'khóa học'],
  trainers: ['trainer', 'pt', 'huấn luyện viên', 'personal trainer', 'coach'],
  equipment: ['thiết bị', 'máy', 'tạ', 'dụng cụ', 'gym equipment'],
  operating_hours: ['giờ', 'mở cửa', 'đóng cửa', 'thời gian', 'hoạt động'],
  contact: ['liên hệ', 'địa chỉ', 'số điện thoại', 'email', 'hotline'],
  policies: ['quy định', 'chính sách', 'policy', 'luật'],
}

// Detect category từ question
const detectCategory = (question) => {
  const questionLower = question.toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => questionLower.includes(keyword))) {
      return category
    }
  }

  return null
}

// Extract keywords for search
const extractKeywords = (question) => {
  return question
    .toLowerCase()
    .split(' ')
    .filter((word) => word.length >= 2)
    .filter((word) => !['là', 'của', 'có', 'gì', 'như', 'thế', 'nào', 'tôi', 'mình'].includes(word))
}

// Main FAQ Handler với enhanced routing
export const handleFAQ = async (question, specificIntent = null) => {
  try {
    const result = await processFAQQuery(question, specificIntent)

    return {
      success: true,
      ...result,
    }
  } catch (error) {
    console.error('FAQ Error:', error)
    return {
      success: false,
      content: 'Xin lỗi, tôi không thể trả lời câu hỏi này lúc này. Vui lòng liên hệ staff để được hỗ trợ.',
      type: 'error',
    }
  }
}

const processFAQQuery = async (question, specificIntent = null) => {
  // Nếu có specific intent từ classifier, thử direct response trước
  if (specificIntent && specificIntent !== 'general_question') {
    const directResult = await getDirectIntentResponse(specificIntent, question)
    if (directResult) {
      return directResult
    }
  }

  const keywords = extractKeywords(question)
  const category = detectCategory(question)

  // LAYER 1: Static Knowledge Base (Exact match)
  const staticResult = await searchStaticKnowledge(keywords, category)
  if (staticResult) {
    return staticResult
  }

  // LAYER 2: Dynamic Database Query (Real-time data)
  const dynamicResult = await searchDynamicData(question, category, keywords)
  if (dynamicResult) {
    return dynamicResult
  }

  // LAYER 3: AI-Generated Answer với context
  const aiResult = await generateAIAnswer(question, category)
  return aiResult
}

// Direct response dựa trên specific intent từ classifier
const getDirectIntentResponse = async (specificIntent, question) => {
  try {
    switch (specificIntent) {
      case 'greeting':
        return {
          content: 'Xin chào! Tôi là trợ lý AI của gym. Bạn cần hỗ trợ gì?',
          type: 'greeting',
          source: 'direct',
          confidence: 0.95,
        }

      case 'operating_hours':
        return await getOperatingHours()

      case 'contact':
        return await getContactInfo()

      case 'membership':
        return await getMembershipInfo([])

      case 'classes':
        return await getClassInfo([])

      case 'trainers':
        return await getTrainerInfo([])

      case 'equipment':
        return await getEquipmentInfo([])

      case 'policies':
        return await getPolicyInfo([])

      default:
        return null
    }
  } catch (error) {
    console.error('Direct intent response error:', error)
    return null
  }
}

const getOperatingHours = async () => {
  return {
    content: `GIỜ HOẠT ĐỘNG:\n\nThứ 2 - Thứ 6: 05:00 - 23:00\nThứ 7 - Chủ nhật: 06:00 - 22:00\n\nGym mở cửa tất cả các ngày trong tuần!`,
    type: 'operating_hours',
    source: 'direct',
    confidence: 0.95,
  }
}

const getPolicyInfo = async (keywords) => {
  // Có thể tìm trong knowledge base hoặc return chung
  return {
    content: `QUY ĐỊNH GYM:\n\n• Tuân thủ giờ hoạt động\n• Mang theo thẻ thành viên\n• Giữ gìn vệ sinh chung\n• Không mang đồ ăn vào khu tập\n• Đặt dụng cụ về chỗ sau khi sử dụng\n\nLiên hệ staff để biết quy định chi tiết!`,
    type: 'policies',
    source: 'direct',
    confidence: 0.8,
  }
}

// LAYER 1: Search trong ChatBotKnowledgeBase + GymInfo
const searchStaticKnowledge = async (keywords, category) => {
  try {
    // Tìm trong knowledge base trước
    const knowledgeItems = await chatbotKnowledgeModel.searchKnowledge(keywords, category)

    if (knowledgeItems.length > 0) {
      const bestMatch = knowledgeItems[0]
      return {
        content: bestMatch.answer,
        type: 'knowledge_base',
        source: 'static',
        category: bestMatch.category,
        confidence: 0.9,
      }
    }

    // Fallback tìm trong GymInfo
    const gymInfoItems = await gymInfoModel.searchInfo(keywords.join(' '))
    if (gymInfoItems.length > 0) {
      const info = gymInfoItems[0]
      return {
        content: formatGymInfo(info),
        type: 'gym_info',
        source: 'static',
        category: info.category,
        confidence: 0.8,
      }
    }

    return null
  } catch (error) {
    console.error('Static search error:', error)
    return null
  }
}

// LAYER 2: Dynamic database queries
const searchDynamicData = async (question, category, keywords) => {
  try {
    switch (category) {
      case 'membership':
        return await getMembershipInfo(keywords)

      case 'classes':
        return await getClassInfo(keywords)

      case 'trainers':
        return await getTrainerInfo(keywords)

      case 'equipment':
        return await getEquipmentInfo(keywords)

      case 'contact':
        return await getContactInfo()

      default:
        return null
    }
  } catch (error) {
    console.error('Dynamic search error:', error)
    return null
  }
}

// Dynamic Data Handlers
const getMembershipInfo = async (keywords) => {
  const allMemberships = await membershipModel.getListWithQuantityUser()

  // Filter để loại bỏ membership inactive (_destroy: true)
  const memberships = allMemberships.filter((membership) => !membership._destroy)

  if (!memberships || memberships.length === 0) {
    return null
  }

  let content = 'CÁC GÓI MEMBERSHIP HIỆN TẠI:\n\n'

  memberships.forEach((membership, index) => {
    content += `${index + 1}. ${membership.name}\n`
    content += `   Giá: ${formatPrice(membership.price)}\n`
    content += `   Thời hạn: ${membership.durationMonth} tháng\n`

    if (membership.discount > 0) {
      content += `   Giảm giá: ${membership.discount}%\n`
    }

    if (membership.features && membership.features.length > 0) {
      content += `   Quyền lợi: ${membership.features.join(', ')}\n`
    }

    if (membership.totalUsers > 0) {
      content += `   Số người đang sử dụng: ${membership.totalUsers}\n`
    }

    content += '\n'
  })

  content += 'Để đăng ký gói, vui lòng liên hệ staff hoặc đăng nhập để đăng ký online!'

  return {
    content,
    type: 'membership_list',
    source: 'dynamic',
    category: 'membership',
    confidence: 0.95,
    data: memberships,
  }
}

const getClassInfo = async (keywords) => {
  let classes = []

  // Lọc theo keywords nếu có
  if (keywords.some((k) => ['yoga'].includes(k))) {
    classes = await classModel.getClassesByType('YOGA')
  } else if (keywords.some((k) => ['boxing', 'đấm bốc'].includes(k))) {
    classes = await classModel.getClassesByType('BOXING')
  } else if (keywords.some((k) => ['dance', 'nhảy'].includes(k))) {
    classes = await classModel.getClassesByType('DANCE')
  } else {
    // Lấy tất cả classes (đã filter _destroy: false)
    classes = await classModel.getList()
  }

  if (!classes || classes.length === 0) {
    return {
      content: 'Hiện tại không có lớp học nào phù hợp. Vui lòng liên hệ staff để biết thêm chi tiết!',
      type: 'no_classes',
      source: 'dynamic',
      confidence: 0.8,
    }
  }

  let content = 'CÁC LỚP HỌC HIỆN TẠI:\n\n'

  classes.forEach((cls, index) => {
    content += `${index + 1}. ${cls.name} (${cls.classType})\n`
    content += `   Mô tả: ${cls.description}\n`
    content += `   Sức chứa: ${cls.capacity} người\n`
    content += `   Giá: ${formatPrice(cls.price)}\n`
    content += `   Thời gian: ${formatDateRange(cls.startDate, cls.endDate)}\n`

    if (cls.trainers && cls.trainers.length > 0) {
      content += `   Số trainer: ${cls.trainers.length} người\n`
    }

    content += '\n'
  })

  content += 'Để xem lịch chi tiết và đăng ký, vui lòng đăng nhập!'

  return {
    content,
    type: 'class_list',
    source: 'dynamic',
    category: 'classes',
    confidence: 0.95,
    data: classes,
  }
}

const getTrainerInfo = async (keywords) => {
  const trainers = await trainerModel.getListTrainerForUser()

  if (!trainers || trainers.length === 0) {
    return null
  }

  let content = 'DANH SÁCH TRAINER:\n\n'

  trainers.forEach((trainer, index) => {
    content += `${index + 1}. ${trainer.userInfo?.fullName || 'N/A'}\n`
    content += `   Chuyên môn: ${trainer.trainerInfo?.specialization || 'N/A'}\n`
    content += `   Giá/buổi: ${formatPrice(trainer.trainerInfo?.pricePerSession || 0)}\n`
    content += `   Kinh nghiệm: ${trainer.trainerInfo?.experience || 'N/A'}\n`
    content += `   Đánh giá: ${trainer.review?.rating || 0}/5 (${trainer.review?.totalBookings || 0} buổi đã dạy)\n`

    if (trainer.trainerInfo?.bio) {
      content += `   Giới thiệu: ${trainer.trainerInfo.bio.substring(0, 100)}...\n`
    }

    content += '\n'
  })

  content += 'Để đặt lịch với trainer, vui lòng đăng nhập và book lịch!'

  return {
    content,
    type: 'trainer_list',
    source: 'dynamic',
    category: 'trainers',
    confidence: 0.95,
    data: trainers,
  }
}

const getEquipmentInfo = async (keywords) => {
  // Check if user is asking about specific muscle group
  const muscleKeywords = {
    ngực: 'chest',
    vai: 'shoulders',
    tay: 'arms',
    lưng: 'back',
    chân: 'legs',
    bụng: 'abs',
    mông: 'glutes',
    cardio: 'cardio',
    'tim mạch': 'cardio',
  }

  let targetMuscle = null
  for (const [keyword, muscle] of Object.entries(muscleKeywords)) {
    if (keywords.some((k) => k.includes(keyword))) {
      targetMuscle = muscle
      break
    }
  }

  let equipment = []

  if (targetMuscle) {
    // Get equipment for specific muscle group
    equipment = await equipmentModel.getEquipmentsByMuscleCategory(targetMuscle)
  } else {
    // Get all equipment grouped by muscle categories
    const groupedEquipment = await equipmentModel.getEquipmentsGroupedByMuscleCategory()

    if (!groupedEquipment || groupedEquipment.length === 0) {
      return null
    }

    let content = 'THIẾT BỊ GYM THEO NHÓM CƠ:\n\n'

    groupedEquipment.forEach((group) => {
      const categoryLabel = getMuscleLabel(group._id)
      content += `${categoryLabel.toUpperCase()} (${group.count} thiết bị):\n`

      group.equipments.forEach((item) => {
        content += `  • ${item.name} (${item.brand})`
        if (item.status === 'maintenance') {
          content += ' - Đang bảo trì'
        } else if (item.status === 'broken') {
          content += ' - Hỏng'
        }
        content += '\n'
      })
      content += '\n'
    })

    return {
      content,
      type: 'equipment_grouped',
      source: 'dynamic',
      category: 'equipment',
      confidence: 0.95,
      data: groupedEquipment,
    }
  }

  if (!equipment || equipment.length === 0) {
    return null
  }

  // For specific muscle group
  const categoryLabel = getMuscleLabel(targetMuscle)
  let content = `THIẾT BỊ TẬP ${categoryLabel.toUpperCase()}:\n\n`

  equipment.forEach((item, index) => {
    content += `${index + 1}. ${item.name} (${item.brand})`
    if (item.status === 'maintenance') {
      content += ' - Đang bảo trì'
    } else if (item.status === 'broken') {
      content += ' - Hỏng'
    }
    content += '\n'
  })

  return {
    content,
    type: 'equipment_by_muscle',
    source: 'dynamic',
    category: 'equipment',
    confidence: 0.95,
    data: equipment,
  }
}

const getContactInfo = async () => {
  const locations = await locationModel.getActiveLocations() // Sử dụng method mới

  if (!locations || locations.length === 0) {
    return null
  }

  let content = 'THÔNG TIN LIÊN HỆ:\n\n'

  locations.forEach((location, index) => {
    content += `${index + 1}. ${location.name}\n`
    content += `   Địa chỉ: ${formatAddress(location.address)}\n`
    content += `   Hotline: ${location.phone}\n\n`
  })

  return {
    content,
    type: 'contact_info',
    source: 'dynamic',
    category: 'contact',
    confidence: 0.95,
    data: locations,
  }
}

// LAYER 3: AI-Generated Answer
const generateAIAnswer = async (question, category) => {
  try {
    const { model } = initializeGeminiClient()

    const context = await buildGymContext()

    const prompt = `
Bạn là trợ lý AI của phòng tập gym. Trả lời câu hỏi dựa trên thông tin sau:

THÔNG TIN GYM:
${context}

CÂU HỎI: "${question}"
CATEGORY: ${category || 'general'}

QUY TẮC:
- Trả lời bằng tiếng Việt
- Ngắn gọn, rõ ràng
- Nếu không biết, thừa nhận và đề xuất liên hệ staff
- Khuyến khích người dùng đăng nhập để biết thêm chi tiết

TRẢ LỜI:
`

    const result = await model.generateContent(prompt)
    const content = result.response.text()

    return {
      content,
      type: 'ai_generated',
      source: 'ai',
      category: category || 'general',
      confidence: 0.7,
    }
  } catch (error) {
    console.error('AI generation error:', error)
    return {
      content: 'Tôi không thể trả lời câu hỏi này. Vui lòng liên hệ staff để được hỗ trợ chi tiết nhất!',
      type: 'fallback',
      source: 'fallback',
      confidence: 0.5,
    }
  }
}

// Utility Functions
const buildGymContext = async () => {
  // Build basic context về gym từ các bảng
  const locations = await locationModel.getAllLocations()
  const memberships = await membershipModel.getAllMemberships()

  let context = ''

  if (locations && locations.length > 0) {
    context += 'CÁC CƠ SỞ:\n'
    locations.forEach((loc) => {
      context += `- ${loc.name}: ${formatAddress(loc.address)}, ${loc.phone}\n`
    })
    context += '\n'
  }

  if (memberships && memberships.length > 0) {
    context += 'CÁC GÓI MEMBERSHIP:\n'
    memberships.forEach((mem) => {
      context += `- ${mem.name}: ${formatPrice(mem.price)}/${mem.durationMonth} tháng\n`
    })
  }

  return context
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price)
}

const formatAddress = (address) => {
  if (typeof address === 'string') return address
  if (typeof address === 'object') {
    return `${address.street || ''}, ${address.district || ''}, ${address.city || ''}`.trim()
  }
  return 'N/A'
}

const getMuscleLabel = (muscleCategory) => {
  const labels = {
    chest: 'Ngực',
    shoulders: 'Vai',
    arms: 'Cánh tay',
    biceps: 'Tay trước',
    triceps: 'Tay sau',
    back: 'Lưng',
    lats: 'Cánh tay rộng',
    abs: 'Bụng',
    core: 'Cơ core',
    obliques: 'Cơ bụng chéo',
    legs: 'Chân',
    quadriceps: 'Đùi trước',
    hamstrings: 'Đùi sau',
    glutes: 'Mông',
    calves: 'Bắp chân',
    full_body: 'Toàn thân',
    cardio: 'Tim mạch',
    forearms: 'Cẳng tay',
    neck: 'Cổ',
    flexibility: 'Độ dẻo dai',
  }

  return labels[muscleCategory] || muscleCategory
}

const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return `${formatDate(start)} - ${formatDate(end)}`
}

const formatGymInfo = (info) => {
  let content = `📋 ${info.key.toUpperCase()}:\n\n`

  if (info.displayFormat === 'html') {
    // Strip HTML tags for text response
    content += info.value.replace(/<[^>]*>/g, '')
  } else if (info.displayFormat === 'json') {
    try {
      const data = JSON.parse(info.value)
      content += JSON.stringify(data, null, 2)
    } catch {
      content += info.value
    }
  } else {
    content += info.value
  }

  return content
}

export const faqService = {
  handleFAQ,
  detectCategory,
  extractKeywords,
}
