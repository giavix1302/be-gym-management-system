/* eslint-disable quotes */
/* eslint-disable indent */
// faq.service.js - Complete FAQ service với nutrition & workout consultation

import { classModel } from '~/modules/class/model/class.model.js'
import { locationModel } from '~/modules/location/model/location.model.js'
import { membershipModel } from '~/modules/membership/model/membership.model.js'
import { formatPrice } from '~/utils/utils.js'

// ✅ THÊM: Function kiểm tra greeting
const isGreeting = (message) => {
  const greetingPatterns = ['xin chào', 'chào', 'hello', 'hi', 'hey']
  return greetingPatterns.some((pattern) => message.includes(pattern))
}

// ✅ THÊM: Function xử lý greeting
const handleGreeting = (userId = null) => {
  const isAuthenticated = !!userId

  const content = `👋 Xin chào! Tôi là trợ lý AI của Elite Fitness.

💪 **TÔI CÓ THỂ HỖ TRỢ BẠN:**

🏢 **Thông tin cơ bản:**
• Giờ mở cửa & địa chỉ các cơ sở
• Liên hệ & hotline

📋 **Dịch vụ & tiện ích:**
• Các gói membership
• Lớp học & trainer  
• Thiết bị & tiện ích

${
  isAuthenticated
    ? `🔐 **Dịch vụ cá nhân:**
• Kiểm tra gói tập hiện tại
• Xem lịch tập cá nhân`
    : `🔐 **Đăng nhập để:**
• Kiểm tra gói membership
• Xem lịch tập cá nhân`
}

💡 **Hãy hỏi tôi bất cứ điều gì về Elite Fitness!**`

  return {
    content,
    type: 'greeting_response',
    data: { isAuthenticated },
  }
}

// Main FAQ handler
export const handleFAQ = async (message, userId = null) => {
  try {
    // Import intent classifier
    const { classifyIntent } = await import('./intent.classifier.js')

    const classification = classifyIntent(message)
    const { specificIntent } = classification

    console.log('FAQ Classification:', classification)

    // Check for nutrition follow-up with BMI info or weight/height questions
    const messageLower = message.toLowerCase()

    // ✅ THÊM: Handle greeting FIRST before other logic
    if (isGreeting(messageLower)) {
      return handleGreeting(userId)
    }

    if (
      messageLower.includes('cao') ||
      messageLower.includes('nặng') ||
      messageLower.includes('bmi') ||
      (messageLower.includes('cm') && messageLower.includes('kg')) ||
      /\d+\s*cm/.test(message) ||
      /\d+\s*kg/.test(message) ||
      /\d+m\d+/.test(message) ||
      messageLower.includes('béo không') ||
      messageLower.includes('gầy không') ||
      messageLower.includes('bình thường không')
    ) {
      const nutritionResult = handleNutritionConsultation(message)
      if (nutritionResult.type === 'nutrition_advice') {
        return nutritionResult
      }
    }

    // Check for workout follow-up with goal info
    if (
      messageLower.includes('tăng cân') ||
      messageLower.includes('giảm cân') ||
      messageLower.includes('tăng cơ') ||
      messageLower.includes('mục tiêu') ||
      messageLower.includes('muốn tăng') ||
      messageLower.includes('muốn giảm')
    ) {
      const workoutResult = handleWorkoutConsultation(message)
      if (workoutResult.type === 'workout_advice') {
        return workoutResult
      }
    }

    // Check for specific membership questions
    if (
      messageLower.includes('gói') &&
      (messageLower.includes('tháng') ||
        messageLower.includes('vip') ||
        messageLower.includes('cao cấp') ||
        messageLower.includes('premium') ||
        messageLower.includes('khác gì'))
    ) {
      const membershipResult = await handleMembershipConsultation(message)
      if (membershipResult.type !== 'memberships_info') {
        // Only use smart response if it's specific
        return membershipResult
      }
    }

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
        response = handleTrainers()
        break

      case 'gym_equipment':
        response = handleEquipment()
        break

      case 'gym_facilities':
        response = handleFacilities()
        break

      case 'technical_report':
        response = handleTechnicalReport()
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

  if (messageLower.includes('1 + 1') || messageLower.includes('1+1')) {
    return {
      content:
        '🧮 1 + 1 = 2! Toán học thật đơn giản, nhưng việc duy trì sức khỏe thì cần nhiều hơn thế. Bạn có muốn tìm hiểu về các chương trình tập luyện không?',
      type: 'math_response',
    }
  }

  if (messageLower.includes('bằng mấy') || messageLower.includes('phép tính') || messageLower.includes('toán học')) {
    return {
      content:
        '🧮 Tôi có thể giúp với toán đơn giản, nhưng chuyên môn của tôi là tư vấn về gym và sức khỏe. Bạn có câu hỏi gì về Elite Fitness không?',
      type: 'math_general_response',
    }
  }

  if (messageLower.includes('đẹp trai') || messageLower.includes('xinh gái') || messageLower.includes('đẹp')) {
    return {
      content: '😊 Wow, tự tin là điều tuyệt vời! Vậy bạn đã sẵn sàng tập gym để trở nên fit hơn nữa chưa? 💪',
      type: 'compliment_response',
    }
  }

  if (messageLower.includes('buồn') || messageLower.includes('stress') || messageLower.includes('áp lực')) {
    return {
      content:
        '🤗 Tập gym là cách tuyệt vời để giải tỏa căng thẳng đấy! Bạn muốn tìm hiểu về các lớp Yoga thư giãn không?',
      type: 'mood_response',
    }
  }

  if (messageLower.includes('yêu') || messageLower.includes('thích')) {
    return {
      content:
        '💕 Thật tuyệt! Hy vọng bạn cũng sẽ yêu thích việc tập luyện tại Elite Fitness. Bạn quan tâm môn thể thao nào?',
      type: 'love_response',
    }
  }

  if (
    messageLower.includes('thời tiết') ||
    messageLower.includes('trời') ||
    messageLower.includes('nắng') ||
    messageLower.includes('mưa')
  ) {
    return {
      content:
        '🌤️ Tôi không theo dõi thời tiết, nhưng dù trời nắng hay mưa thì Elite Fitness vẫn luôn là nơi tuyệt vời để tập luyện trong không gian mát mẻ! Bạn muốn biết giờ mở cửa không?',
      type: 'weather_response',
    }
  }

  if (
    messageLower.includes('chế độ ăn') ||
    messageLower.includes('dinh dưỡng') ||
    messageLower.includes('ăn uống') ||
    messageLower.includes('thực đơn') ||
    messageLower.includes('tư vấn ăn')
  ) {
    return {
      content:
        '🥗 TƯ VẤN DINH DƯỠNG ELITE FITNESS\n\nĐể tư vấn chế độ dinh dưỡng phù hợp nhất, tôi cần biết chỉ số BMI của bạn.\n\n📏 **Vui lòng cho biết:**\n• Chiều cao (cm): ví dụ 170cm\n• Cân nặng (kg): ví dụ 65kg\n\nHoặc nếu bạn đã biết BMI, hãy cho tôi biết số đó.\n\n💡 Tôi sẽ đưa ra lời khuyên về:\n• Chế độ ăn phù hợp với mục tiêu\n• Thực đơn gợi ý cho từng bữa\n• Nguyên tắc dinh dưỡng cần lưu ý',
      type: 'nutrition_inquiry',
    }
  }

  if (
    messageLower.includes('bài tập') ||
    messageLower.includes('tập luyện') ||
    messageLower.includes('workout') ||
    messageLower.includes('exercise') ||
    messageLower.includes('tập gym') ||
    messageLower.includes('luyện tập')
  ) {
    return {
      content:
        '💪 TƯ VẤN BÀI TẬP ELITE FITNESS\n\nĐể đưa ra chương trình tập luyện phù hợp nhất, tôi cần biết mục tiêu của bạn.\n\n🎯 **Mục tiêu của bạn là gì?**\n\n1️⃣ **TĂNG CÂN** - Xây dựng cơ bắp & tăng cân khỏe mạnh\n2️⃣ **GIẢM CÂN** - Đốt mỡ & giảm cân hiệu quả\n3️⃣ **TĂNG CƠ** - Phát triển kích thước cơ bắp\n\nVui lòng cho tôi biết mục tiêu của bạn, tôi sẽ tư vấn:\n• Chương trình tập phù hợp\n• Các bài tập cụ thể\n• Cường độ và số hiệp/lần\n• Lịch tập hàng tuần',
      type: 'workout_inquiry',
    }
  }

  if (
    messageLower.includes('phòng tắm') ||
    messageLower.includes('tắm nước nóng') ||
    messageLower.includes('nước nóng') ||
    messageLower.includes('sauna') ||
    messageLower.includes('xông hơi') ||
    messageLower.includes('jacuzzi') ||
    messageLower.includes('bể sục') ||
    messageLower.includes('tiện ích') ||
    messageLower.includes('dịch vụ') ||
    messageLower.includes('tủ khóa') ||
    messageLower.includes('thay đồ') ||
    messageLower.includes('facilities')
  ) {
    return {
      content:
        '🛁 **TIỆN ÍCH & DỊCH VỤ ELITE FITNESS**\n\nElite Fitness tự hào mang đến hệ thống tiện ích cao cấp, đầy đủ cho nhu cầu thư giãn và chăm sóc sức khỏe:\n\n🚿 **PHÒNG TẮM & THAY ĐỒ:**\n• Phòng tắm nước nóng hiện đại\n• Khu vực thay đồ riêng biệt nam/nữ\n• Tủ khóa cá nhân an toàn\n• Đồ dùng vệ sinh cao cấp\n\n🧖‍♀️ **DỊCH VỤ THƯ GIÃN:**\n• Phòng Xông Hơi Khô (Sauna)\n• Bể Sục Nóng (Jacuzzi)\n• Khu vực massage và trị liệu\n\n✨ **TIỆN ÍCH KHÁC:**\n• Máy sấy tóc chuyên dụng\n• Khu vực nghỉ ngơi thoáng mát\n• Wifi miễn phí toàn bộ khu vực\n• Bãi đậu xe rộng rãi\n\n💡 Tất cả dịch vụ đều được vệ sinh và bảo trì thường xuyên để đảm bảo chất lượng tốt nhất cho hội viên.',
      type: 'facilities_info',
    }
  }

  // Personal account queries (require login)
  if (
    messageLower.includes('lịch sử thanh toán') ||
    messageLower.includes('lịch sử giao dịch') ||
    messageLower.includes('xem thanh toán') ||
    messageLower.includes('payment history') ||
    messageLower.includes('lịch sử tập luyện') ||
    messageLower.includes('workout history') ||
    messageLower.includes('xem lịch sử') ||
    messageLower.includes('check history')
  ) {
    return {
      content:
        '🔐 **TRUY CẬP THÔNG TIN CÁ NHÂN**\n\nĐể xem lịch sử thanh toán và hoạt động tập luyện, bạn cần đăng nhập vào tài khoản Elite Fitness.\n\n📱 **Cách truy cập:**\n• Đăng nhập qua ứng dụng Elite Fitness\n• Đăng nhập qua website\n• Yêu cầu hỗ trợ tại quầy lễ tân\n\n📊 **Thông tin có thể xem:**\n• Lịch sử thanh toán membership\n• Lịch sử booking trainer & lớp học\n• Thống kê hoạt động tập luyện\n• Điểm tích lũy và ưu đãi\n\n💡 Sau khi đăng nhập, tôi có thể hỗ trợ bạn tra cứu thông tin cụ thể.',
      type: 'login_required_info',
    }
  }

  // Refund policy questions
  if (
    messageLower.includes('hoàn tiền') ||
    messageLower.includes('hoàn lại') ||
    messageLower.includes('refund') ||
    messageLower.includes('hủy gói') ||
    messageLower.includes('trả lại tiền') ||
    messageLower.includes('đổi gói')
  ) {
    return {
      content:
        '💰 **CHÍNH SÁCH HOÀN TIỀN ELITE FITNESS**\n\nElite Fitness rất cảm ơn sự quan tâm của quý khách về chính sách hoàn tiền:\n\n❌ **GÓI MEMBERSHIP:**\n• Các gói membership đã kích hoạt không được hoàn tiền\n• Chính sách này nhằm đảm bảo tính công bằng cho tất cả hội viên\n\n✅ **CÓ THỂ HOÀN TIỀN:**\n• Booking trainer cá nhân (hủy trước 24h)\n• Đăng ký lớp học nhóm (hủy trước 12h)\n• Các dịch vụ bổ sung chưa sử dụng\n\n🔄 **THAY THẾN:**\n• Hỗ trợ chuyển đổi giữa các cơ sở\n• Tạm dừng membership (trong trường hợp đặc biệt)\n• Gia hạn thời gian sử dụng\n\n🤝 **Lưu ý:** Mọi trường hợp đặc biệt sẽ được xem xét cụ thể. Quý khách vui lòng liên hệ để được hỗ trợ tư vấn.',
      type: 'refund_policy_info',
    }
  }

  // Technical issues/complaints
  if (
    messageLower.includes('máy bị hư') ||
    messageLower.includes('thiết bị hỏng') ||
    messageLower.includes('phản ánh') ||
    messageLower.includes('khiếu nại') ||
    messageLower.includes('báo cáo') ||
    messageLower.includes('report') ||
    messageLower.includes('máy không hoạt động') ||
    messageLower.includes('equipment broken')
  ) {
    return {
      content:
        '🛠️ **BÁO CÁO SỰ CỐ THIẾT BỊ**\n\nElite Fitness rất cảm ơn bạn đã phản ánh về tình trạng thiết bị:\n\n⚡ **CÁCH BÁO CÁO NHANH:**\n• Thông báo trực tiếp với staff tại phòng gym\n• Gọi hotline: 1900-1234 (24/7)\n• Báo cáo qua app Elite Fitness (mục "Báo cáo sự cố")\n• Email: technical@elitefitness.vn\n\n📝 **THÔNG TIN CẦN CUNG CẤP:**\n• Tên thiết bị và vị trí cụ thể\n• Mô tả hiện tượng hỏng hóc\n• Thời gian phát hiện sự cố\n• Cơ sở gym nào\n\n🔧 **CAM KẾT CỦA ELITE FITNESS:**\n• Tiếp nhận và xử lý trong 30 phút\n• Cách ly thiết bị hỏng ngay lập tức\n• Sửa chữa hoặc thay thế trong 24-48h\n\n💡 Sự an toàn của hội viên là ưu tiên hàng đầu của chúng tôi!',
      type: 'technical_report_info',
    }
  }

  // Default for other random statements - ✅ FIXED: Remove weird response
  return {
    content:
      '🤖 Tôi là trợ lý AI của Elite Fitness. Tôi có thể giúp bạn tìm hiểu về gym, các gói membership, lớp học và nhiều thông tin khác. Bạn muốn biết gì?',
    type: 'general_response',
  }
}

// 2. Gym locations
const handleLocations = async () => {
  try {
    const locations = await locationModel.getListLocation()

    if (!locations || locations.length === 0) {
      return {
        content:
          'Hiện tại thông tin cơ sở đang được cập nhật. Vui lòng liên hệ để được hỗ trợ tốt nhất!\n\n📞 Hotline: 1900-1234',
        type: 'no_locations_error',
      }
    }

    const count = locations.length
    const displayLocations = locations.slice(0, 3)

    let content = `🏢 HỆ THỐNG CƠ SỞ ELITE FITNESS\n\nElite Fitness hiện đang phục vụ tại ${count} cơ sở chiến lược, mang đến sự tiện lợi tối đa cho hội viên:\n\n`

    displayLocations.forEach((location, index) => {
      content += `${index + 1}. 📍 **${location.name}**\n`
      if (location.address?.full) {
        content += `   ${location.address.full}\n`
      }
      content += `   ⏰ Hoạt động: 06:00 - 22:00\n\n`
    })

    if (count > 3) {
      content += `🔥 Và ${
        count - 3
      } cơ sở khác đang chờ bạn khám phá!\n💡 Đăng nhập để xem toàn bộ hệ thống cơ sở và chọn địa điểm phù hợp nhất.\n\n`
    }

    content += `🎯 **Tất cả cơ sở đều được trang bị:**\n• Thiết bị tập luyện hiện đại\n• Không gian thoáng mát, sạch sẽ\n• Đội ngũ hỗ trợ chuyên nghiệp\n• Hệ thống an ninh 24/7`

    return {
      content,
      type: 'locations_info',
      data: { count, locations: displayLocations },
    }
  } catch (error) {
    console.error('Get locations error:', error)
    return {
      content:
        'Xin lỗi, hiện tại không thể tải thông tin cơ sở. Đội ngũ kỹ thuật đang khắc phục.\n\nVui lòng liên hệ trực tiếp để được hỗ trợ:\n📞 Hotline: 1900-1234\n📧 Email: info@elitefitness.vn',
      type: 'locations_error',
    }
  }
}

// 3. Memberships - Trả lời thông minh theo câu hỏi
const handleMemberships = async () => {
  try {
    const memberships = await membershipModel.getListWithQuantityUser()

    if (!memberships || memberships.length === 0) {
      return {
        content:
          'Hiện tại thông tin gói membership đang được cập nhật. Vui lòng liên hệ để được tư vấn chi tiết!\n\n📞 Hotline: 1900-1234',
        type: 'no_memberships_error',
      }
    }

    const count = memberships.length

    let content = `💪 **CÁC GÓI MEMBERSHIP ELITE FITNESS**\n\nElite Fitness cung cấp ${count} gói membership được thiết kế linh hoạt, phù hợp với mọi nhu cầu tập luyện:\n\n`

    memberships.slice(0, 3).forEach((membership, index) => {
      content += `${index + 1}. 🏆 **${membership.name}**\n`
      content += `   💰 Chỉ từ ${formatPrice(membership.price)} cho ${membership.durationMonth} tháng\n`
      if (membership.discount > 0) {
        content += `   🎉 Ưu đãi đặc biệt: Giảm ngay ${membership.discount}%\n`
      }
      content += '\n'
    })

    if (count > 3) {
      content += `🌟 Cùng ${count - 3} gói membership khác với nhiều quyền lợi hấp dẫn!\n\n`
    }

    content += `✨ **Quyền lợi chung tất cả gói:**\n• Tập luyện không giới hạn tại tất cả cơ sở\n• Tham gia các lớp học nhóm miễn phí\n• Được hỗ trợ bởi đội ngũ trainer chuyên nghiệp\n• Tủ khóa cá nhân và không gian thay đồ\n\n💡 Đăng nhập để xem chi tiết từng gói và nhận tư vấn cá nhân hóa.`

    return {
      content,
      type: 'memberships_info',
      data: { count, memberships: memberships.slice(0, 3) },
    }
  } catch (error) {
    console.error('Get memberships error:', error)
    return {
      content:
        'Xin lỗi, hiện tại không thể tải thông tin gói membership. Đội ngũ kỹ thuật đang khắc phục.\n\nVui lòng liên hệ trực tiếp để được tư vấn:\n📞 Hotline: 1900-1234\n📧 Email: info@elitefitness.vn',
      type: 'memberships_error',
    }
  }
}

// Smart membership consultation based on specific questions
const handleMembershipConsultation = async (message) => {
  try {
    const memberships = await membershipModel.getListWithQuantityUser()

    if (!memberships || memberships.length === 0) {
      return {
        content:
          'Xin lỗi, hiện tại thông tin gói membership đang được cập nhật. Vui lòng liên hệ để được tư vấn chi tiết!',
        type: 'no_memberships_error',
      }
    }

    const messageLower = message.toLowerCase()

    // Check for specific month duration
    const monthMatch = message.match(/(\d+)\s*tháng/i)
    if (monthMatch) {
      const requestedMonths = parseInt(monthMatch[1])
      const matchingPlan = memberships.find((m) => m.durationMonth === requestedMonths)

      if (matchingPlan) {
        return {
          content: `💪 **GÓI ${requestedMonths} THÁNG - ${matchingPlan.name.toUpperCase()}**\n\nĐây chính là thông tin bạn cần:\n\n🏆 **Tên gói:** ${
            matchingPlan.name
          }\n💰 **Giá:** ${formatPrice(
            matchingPlan.price
          )} cho ${requestedMonths} tháng\n📊 **Giá trung bình:** ${formatPrice(
            Math.round(matchingPlan.price / requestedMonths)
          )}/tháng\n${
            matchingPlan.discount > 0 ? `🎉 **Ưu đãi:** Giảm ngay ${matchingPlan.discount}%\n` : ''
          }\n✨ **Quyền lợi bao gồm:**\n• Tập luyện không giới hạn tại tất cả cơ sở\n• Tham gia các lớp học nhóm miễn phí\n• Hỗ trợ từ đội ngũ trainer chuyên nghiệp\n• Tủ khóa cá nhân và phòng thay đồ\n\n💡 Đây là gói ${
            requestedMonths === 1
              ? 'linh hoạt nhất'
              : requestedMonths <= 3
              ? 'phù hợp cho người mới bắt đầu'
              : 'tối ưu về chi phí'
          } của Elite Fitness!`,
          type: 'specific_membership_info',
          data: { matchingPlan, requestedMonths },
        }
      } else {
        // Suggest available alternatives
        const availableMonths = memberships.map((m) => m.durationMonth).sort((a, b) => a - b)
        const closestPlan = memberships.reduce((prev, curr) => {
          return Math.abs(curr.durationMonth - requestedMonths) < Math.abs(prev.durationMonth - requestedMonths)
            ? curr
            : prev
        })

        return {
          content: `💪 **THÔNG TIN VỀ GÓI ${requestedMonths} THÁNG**\n\nRất tiếc, Elite Fitness hiện tại chưa có gói ${requestedMonths} tháng.\n\n📋 **Các gói hiện có:**\n${availableMonths
            .map((month) => `• Gói ${month} tháng`)
            .join('\n')}\n\n💡 **Gợi ý cho bạn:**\nGói ${closestPlan.durationMonth} tháng (${
            closestPlan.name
          }) có thể phù hợp với nhu cầu của bạn:\n💰 Giá: ${formatPrice(
            closestPlan.price
          )}\n📊 Trung bình: ${formatPrice(
            Math.round(closestPlan.price / closestPlan.durationMonth)
          )}/tháng\n\n🤝 Quý khách có thể tham khảo các gói trên hoặc liên hệ để được tư vấn thêm về các ưu đãi đặc biệt.`,
          type: 'membership_not_available',
          data: { requestedMonths, availableMonths, closestPlan },
        }
      }
    }

    // Check for VIP questions
    if (messageLower.includes('vip') || messageLower.includes('cao cấp') || messageLower.includes('premium')) {
      const availablePackages = memberships.map((m) => `${m.name} (${m.durationMonth} tháng)`).join(', ')

      return {
        content: `👑 **VỀ GÓI VIP/CAO CẤP**\n\nCảm ơn bạn đã quan tâm đến gói VIP của Elite Fitness.\n\n📋 **Thông tin hiện tại:**\nElite Fitness hiện chưa có phân loại gói VIP hay Premium riêng biệt. Tất cả hội viên đều được hưởng cùng một mức dịch vụ chất lượng cao.\n\n🏆 **Các gói hiện có:**\n• ${availablePackages}\n\n✨ **Tất cả gói đều bao gồm:**\n• Toàn bộ tiện ích cao cấp (Sauna, Jacuzzi, massage)\n• Thiết bị hiện đại từ thương hiệu uy tín\n• Hỗ trợ từ trainer chuyên nghiệp\n• Không gian tập luyện premium\n\n💡 **Đặc biệt:** Gói càng dài hạn, ưu đãi càng hấp dẫn!\n\n🤝 Elite Fitness cam kết mang đến trải nghiệm VIP cho mọi hội viên, bất kể gói nào bạn chọn.`,
        type: 'vip_package_info',
        data: { availablePackages },
      }
    }

    // Default case - show all packages
    return await handleMemberships()
  } catch (error) {
    console.error('Membership consultation error:', error)
    return {
      content: 'Xin lỗi, đã xảy ra lỗi khi tải thông tin gói membership. Vui lòng thử lại sau!',
      type: 'membership_consultation_error',
    }
  }
}

// 4. Classes
const handleClasses = async () => {
  try {
    const locations = await locationModel.getListLocation()

    let content = `🏃‍♀️ LỚP HỌC ELITE FITNESS\n\nElite Fitness cung cấp đa dạng các lớp học phù hợp với mọi đối tượng:\n\n🎯 **CÁC LOẠI LỚP HỌC:**\n• Yoga - Thư giãn & cân bằng cơ thể\n• Boxing - Rèn luyện sức mạnh & phản xạ\n• Dance - Năng động & đầy sáng tạo\n• Aerobic - Tim mạch & giảm cân\n• Pilates - Tăng cường sức bền\n• Strength Training - Phát triển cơ bắp\n\n`

    if (locations && locations.length > 0) {
      content += `🏢 **CÁC CƠ SỞ HIỆN CÓ:**\n`
      locations.forEach((location, index) => {
        content += `${index + 1}. ${location.name}\n`
      })
      content += `\n💡 Bạn muốn tìm hiểu các lớp học cụ thể ở cơ sở nào? Vui lòng đăng nhập để xem lịch học chi tiết tại từng địa điểm.`
    } else {
      content += `💡 Đăng nhập để xem lịch học chi tiết tại các cơ sở của chúng tôi.`
    }

    return {
      content,
      type: 'classes_info',
      data: {
        hasClasses: true,
        locations: locations || [],
        classTypes: ['yoga', 'boxing', 'dance', 'aerobic', 'pilates', 'strength'],
      },
    }
  } catch (error) {
    return {
      content: `🏃‍♀️ LỚP HỌC ELITE FITNESS\n\nElite Fitness cung cấp đa dạng các lớp học như Yoga, Boxing, Dance, Aerobic, Pilates và nhiều hơn nữa.\n\n💡 Đăng nhập để xem lịch học chi tiết và đăng ký lớp phù hợp với bạn.`,
      type: 'classes_info',
    }
  }
}

// 5. Trainers
const handleTrainers = () => {
  return {
    content: `👨‍💪 HUẤN LUYỆN VIÊN ELITE FITNESS\n\nElite Fitness tự hào sở hữu đội ngũ huấn luyện viên chuyên nghiệp với nhiều năm kinh nghiệm trong lĩnh vực fitness.\n\n🎯 ĐẶC ĐIỂM NỔI BẬT:\n• Được đào tạo bài bản, có chứng chỉ quốc tế\n• Chuyên môn đa dạng: Gym, Yoga, Boxing, Dance\n• Tận tâm hỗ trợ từng học viên\n• Lên lịch tập phù hợp với mục tiêu cá nhân\n\n💡 Để xem thông tin chi tiết các huấn luyện viên và đặt lịch tập, bạn vui lòng đăng nhập hệ thống.`,
    type: 'trainers_info',
    data: { hasTrainers: true },
  }
}

// 6. Equipment
const handleEquipment = () => {
  return {
    content: `🏋️ THIẾT BỊ ELITE FITNESS\n\nElite Fitness được trang bị hệ thống thiết bị hiện đại, chất lượng cao từ các thương hiệu uy tín thế giới.\n\n⭐ CÁC LOẠI THIẾT BỊ:\n• Máy tập tim mạch (Treadmill, Bike, Elliptical)\n• Hệ thống tạ và máy tập sức mạnh\n• Thiết bị Functional Training\n• Dụng cụ Yoga, Pilates, Aerobic\n• Khu vực tập tự do với đầy đủ tạ đơn\n\n💡 Đăng nhập để xem chi tiết thiết bị tại từng cơ sở.`,
    type: 'equipment_info',
    data: { hasEquipment: true },
  }
}

// 7. Facilities & Services
const handleFacilities = () => {
  return {
    content: `🛁 **TIỆN ÍCH & DỊCH VỤ ELITE FITNESS**\n\nElite Fitness tự hào mang đến hệ thống tiện ích cao cấp, đầy đủ cho nhu cầu thư giãn và chăm sóc sức khỏe:\n\n🚿 **PHÒNG TẮM & THAY ĐỒ:**\n• Phòng tắm nước nóng hiện đại\n• Khu vực thay đồ riêng biệt nam/nữ\n• Tủ khóa cá nhân an toàn\n• Đồ dùng vệ sinh cao cấp\n\n🧖‍♀️ **DỊCH VỤ THƯ GIÃN:**\n• Phòng Xông Hơi Khô (Sauna)\n• Bể Sục Nóng (Jacuzzi)\n• Khu vực massage và trị liệu\n\n✨ **TIỆN ÍCH KHÁC:**\n• Máy sấy tóc chuyên dụng\n• Khu vực nghỉ ngơi thoáng mát\n• Wifi miễn phí toàn bộ khu vực\n• Bãi đậu xe rộng rãi\n\n💡 Tất cả dịch vụ đều được vệ sinh và bảo trì thường xuyên để đảm bảo chất lượng tốt nhất cho hội viên.`,
    type: 'facilities_info',
    data: { hasFacilities: true },
  }
}

// 8. Technical Reports
const handleTechnicalReport = () => {
  return {
    content: `🛠️ **BÁO CÁO SỰ CỐ THIẾT BỊ**\n\nElite Fitness rất cảm ơn bạn đã phản ánh về tình trạng thiết bị:\n\n⚡ **CÁCH BÁO CÁO NHANH:**\n• Thông báo trực tiếp với staff tại phòng gym\n• Gọi hotline: 1900-1234 (24/7)\n• Báo cáo qua app Elite Fitness (mục "Báo cáo sự cố")\n• Email: technical@elitefitness.vn\n\n📝 **THÔNG TIN CẦN CUNG CẤP:**\n• Tên thiết bị và vị trí cụ thể\n• Mô tả hiện tượng hỏng hóc\n• Thời gian phát hiện sự cố\n• Cơ sở gym nào\n\n🔧 **CAM KẾT CỦA ELITE FITNESS:**\n• Tiếp nhận và xử lý trong 30 phút\n• Cách ly thiết bị hỏng ngay lập tức\n• Sửa chữa hoặc thay thế trong 24-48h\n\n💡 Sự an toàn của hội viên là ưu tiên hàng đầu của chúng tôi!`,
    type: 'technical_report_info',
    data: { reportType: 'equipment_issue' },
  }
}

// 9. Basic info
const handleBasicInfo = (message) => {
  if (message.includes('mở cửa') || message.includes('giờ')) {
    return {
      content:
        '⏰ **GIỜ HOẠT ĐỘNG ELITE FITNESS**\n\nElite Fitness hân hạnh phục vụ quý khách hàng:\n\n📅 **Thời gian:** Thứ Hai - Chủ Nhật\n🕕 **Giờ hoạt động:** 06:00 - 22:00 (16 tiếng/ngày)\n\n🌅 Mở cửa sớm để phục vụ những người tập buổi sáng\n🌙 Đóng cửa muộn để đáp ứng nhu cầu tập buổi tối\n\n💡 Elite Fitness luôn sẵn sàng đón tiếp bạn vào bất kỳ thời điểm thuận tiện!',
      type: 'hours_info',
    }
  }

  if (message.includes('liên hệ') || message.includes('hotline')) {
    return {
      content:
        '📞 **THÔNG TIN LIÊN HỆ ELITE FITNESS**\n\nRất hân hạnh được hỗ trợ bạn:\n\n📱 **Hotline:** 1900-1234\n📧 **Email:** info@elitefitness.vn\n🌐 **Website:** www.elitefitness.vn\n📍 **Địa chỉ:** Xem danh sách các cơ sở\n\n💬 Đội ngũ tư vấn chuyên nghiệp sẵn sàng giải đáp mọi thắc mắc 24/7!',
      type: 'contact_info',
    }
  }

  return {
    content:
      '🏋️ **ELITE FITNESS - PHÒNG TẬP HIỆN ĐẠI**\n\nChào mừng bạn đến với Elite Fitness!\n\n⏰ **Giờ hoạt động:** 06:00 - 22:00 (Hàng ngày)\n🎯 **Sứ mệnh:** Mang đến trải nghiệm tập luyện tốt nhất\n💪 **Cam kết:** Hỗ trợ bạn đạt được mục tiêu sức khỏe\n\nHãy để Elite Fitness đồng hành cùng hành trình của bạn!',
    type: 'basic_info',
  }
}

// Handle nutrition consultation based on BMI
const handleNutritionConsultation = (message) => {
  const messageLower = message.toLowerCase()

  const heightMatch = message.match(/(\d{1,3})\s*cm|\s(\d{1,3})\s*cao|chiều cao\s*(\d{1,3})|(\d)m(\d{2})|1m(\d{2})/i)
  const weightMatch = message.match(
    /(\d{1,3}(?:\.\d{1,2})?)\s*kg|\s(\d{1,3}(?:\.\d{1,2})?)\s*cân|cân nặng\s*(\d{1,3}(?:\.\d{1,2})?)|nặng\s*(\d{1,3}(?:\.\d{1,2})?)/i
  )
  const bmiMatch = message.match(/bmi\s*(\d{1,2}(?:\.\d{1,2})?)/i)

  let height, weight, bmi

  if (bmiMatch) {
    bmi = parseFloat(bmiMatch[1])
  } else if (heightMatch && weightMatch) {
    // Handle different height formats
    if (heightMatch[4] && heightMatch[5]) {
      // Format: 1m70 -> heightMatch[4] = "1", heightMatch[5] = "70"
      height = parseInt(heightMatch[4]) * 100 + parseInt(heightMatch[5])
    } else if (heightMatch[6]) {
      // Format: 1m70 -> heightMatch[6] = "70" (when matched with 1m(\d{2}))
      height = 100 + parseInt(heightMatch[6])
    } else {
      // Regular format: 170cm
      height = parseInt(heightMatch[1] || heightMatch[2] || heightMatch[3])
    }

    weight = parseFloat(weightMatch[1] || weightMatch[2] || weightMatch[3] || weightMatch[4])

    if (height && weight && height > 50 && height < 250 && weight > 20 && weight < 300) {
      bmi = weight / Math.pow(height / 100, 2)
    }
  }

  if (bmi) {
    return getNutritionAdvice(bmi, height, weight)
  }

  return {
    content:
      '📊 Để tư vấn chính xác, vui lòng cung cấp thông tin:\n\n**Cách 1:** Chiều cao và cân nặng\nVí dụ: "Tôi cao 170cm, nặng 65kg"\n\n**Cách 2:** BMI (nếu đã biết)\nVí dụ: "BMI của tôi là 22.5"\n\nTôi sẽ tư vấn chế độ dinh dưỡng phù hợp ngay sau đó! 💪',
    type: 'nutrition_request_info',
  }
}

// Get nutrition advice based on BMI
const getNutritionAdvice = (bmi, height, weight) => {
  let category, goal, advice

  if (bmi < 18.5) {
    category = 'GẦY - CẦN TĂNG CÂN'
    goal = 'tăng cân khỏe mạnh'
    advice = `🧍 **CHƯƠNG TRÌNH TĂNG CÂN**

**Mục tiêu:** Tăng calo + protein để xây dựng cơ bắp

**NGUYÊN TẮC:**
• Ăn thường xuyên: 5-6 bữa/ngày
• Tăng calo tự nhiên (không phải đồ ngọt)
• Protein cao: thịt, trứng, sữa, hạt

**THỰC ĐƠN GỢI Ý:**
🌅 **Sáng:** Phở bò + 1 ly sữa + chuối
🥪 **Phụ sáng:** Bánh mì thịt + sữa đậu nành
🍚 **Trưa:** 2-3 chén cơm + thịt/cá + rau
🥜 **Phụ chiều:** Hạt óc chó + khoai lang
🍽️ **Tối:** Cơm + trứng/thịt + canh
🥛 **Trước ngủ:** Sữa nóng hoặc sữa tăng cân`
  } else if (bmi >= 18.5 && bmi < 25) {
    category = 'BÌNH THƯỜNG - DUY TRÌ'
    goal = 'duy trì cân nặng lý tưởng'
    advice = `⚖️ **CHƯƠNG TRÌNH DUY TRÌ CÂN BẰNG**

**Mục tiêu:** Cân bằng calo vào/ra + dinh dưỡng đầy đủ

**NGUYÊN TẮC:**
• Đa dạng thực phẩm từ 4 nhóm chính
• Quy tắc đĩa: 1/2 rau, 1/4 protein, 1/4 tinh bột
• Uống đủ nước, hạn chế đồ chiên rán

**THỰC ĐƠN GỢI Ý:**
🌅 **Sáng:** Bánh mì trứng + rau + nước ép
🍚 **Trưa:** 1.5 chén cơm + thịt kho + canh rau
🍎 **Phụ chiều:** Sữa chua + trái cây
🍽️ **Tối:** Cá hấp + rau luộc + cơm gạo lứt

**Lưu ý:** Tập gym 3-4 lần/tuần để duy trì sức khỏe tốt!`
  } else if (bmi >= 25 && bmi < 30) {
    category = 'THỪA CÂN - CẦN GIẢM'
    goal = 'giảm cân từ từ và bền vững'
    advice = `📉 **CHƯƠNG TRÌNH GIẢM CÂN**

**Mục tiêu:** Tạo thâm hụt calo + duy trì cơ bắp

**NGUYÊN TẮC:**
• Giảm calo nhưng đủ dinh dưỡng
• Tăng protein, giảm tinh bột tinh chế
• Nhiều rau xanh, uống nhiều nước

**THỰC ĐƠN GỢI Ý:**
🌅 **Sáng:** Yến mạch + trứng luộc + trái cây
🥗 **Trưa:** Cơm gạo lứt + ức gà + salad lớn
🍎 **Phụ chiều:** Táo hoặc dưa chuột
🍽️ **Tối:** Canh rau + thịt nạc (ít tinh bột)

**Lưu ý:** Kết hợp cardio + gym để giảm mỡ hiệu quả!`
  } else {
    category = 'BÉO PHÌ - CẦN HỖ TRỢ CHUYÊN SÂU'
    goal = 'giảm cân an toàn dưới sự giám sát'
    advice = `⚠️ **CHƯƠNG TRÌNH ĐẶC BIỆT**

**Quan trọng:** BMI > 30 cần tham vấn bác sĩ trước khi bắt đầu

**NGUYÊN TẮC CƠ BẢN:**
• Giảm calo từ từ (không quá nhanh)
• Tập trung protein cao + ít carb
• Nhiều nước, nhiều rau, ít chất béo

**GỢI Ý BAN ĐẦU:**
🌅 **Sáng:** Yến mạch + lòng trắng trứng
🥗 **Trưa:** Salad gà + rau xanh
🍽️ **Tối:** Canh rau + cá/tôm luộc

**Khuyến cáo:** Nên có PT riêng và nhà dinh dưỡng hỗ trợ!`
  }

  const bmiDisplay = typeof bmi === 'number' ? bmi.toFixed(1) : 'N/A'
  const heightDisplay = height ? `${height}cm` : 'N/A'
  const weightDisplay = weight ? `${weight}kg` : 'N/A'

  return {
    content: `📊 **PHÂN TÍCH CHỈ SỐ CỦA BẠN**

👤 Chiều cao: ${heightDisplay}
⚖️ Cân nặng: ${weightDisplay}
📈 BMI: ${bmiDisplay}
📋 Phân loại: ${category}

${advice}

💡 **ELITE FITNESS có thể hỗ trợ:**
• PT cá nhân cho chương trình ${goal}
• Các lớp học phù hợp với mục tiêu
• Theo dõi tiến độ và điều chỉnh

Bạn muốn đăng ký tập thử để bắt đầu hành trình của mình không?`,
    type: 'nutrition_advice',
    data: {
      bmi: parseFloat(bmiDisplay),
      category,
      goal,
      height,
      weight,
    },
  }
}

// Handle workout consultation based on goals
const handleWorkoutConsultation = (message) => {
  const messageLower = message.toLowerCase()

  let goal = null

  if (messageLower.includes('tăng cân') || (messageLower.includes('gầy') && messageLower.includes('tăng'))) {
    goal = 'gain_weight'
  } else if (messageLower.includes('giảm cân') || messageLower.includes('giảm mỡ') || messageLower.includes('đốt mỡ')) {
    goal = 'lose_weight'
  } else if (
    messageLower.includes('tăng cơ') ||
    messageLower.includes('phát triển cơ') ||
    messageLower.includes('to cơ')
  ) {
    goal = 'build_muscle'
  }

  if (goal) {
    return getWorkoutAdvice(goal)
  }

  return {
    content:
      '🎯 Vui lòng cho tôi biết mục tiêu cụ thể:\n\n**Nhập một trong các từ khóa:**\n• "Tăng cân" - Để xây dựng cơ bắp\n• "Giảm cân" - Để đốt mỡ thừa\n• "Tăng cơ" - Để phát triển kích thước cơ\n\nTôi sẽ đưa ra chương trình tập phù hợp ngay! 💪',
    type: 'workout_request_goal',
  }
}

// Get workout advice based on goal
const getWorkoutAdvice = (goal) => {
  let title, objective, principles, exercises, schedule

  if (goal === 'gain_weight') {
    title = '🥇 CHƯƠNG TRÌNH TĂNG CÂN (Tăng Cơ Nền Tảng)'
    objective = 'Xây dựng khối lượng cơ bắp và sức mạnh toàn thân'
    principles = `**NGUYÊN TẮC TẬP:**
• Tạ nặng (thực hiện khó khăn ở lần cuối)
• Ít lần lặp: 6-10 reps/hiệp
• Nhiều hiệp: 3-5 hiệp/bài
• Nghỉ dài: 90s-3 phút giữa các hiệp
• Ưu tiên bài tập đa khớp (Compound)`

    exercises = `**BÀI TẬP CỐT LÕI:**
🦵 **Chân/Toàn thân:**
• Barbell Squat (Gánh tạ)
• Deadlift (Kéo tạ)
• Leg Press (Đạp chân máy)

💪 **Ngực:**
• Bench Press (Đẩy ngực tạ đòn)
• Incline Dumbbell Press (Đẩy ngực dốc)

🏃 **Lưng:**
• Barbell Row (Gập người kéo tạ)
• Pull-up/Lat Pulldown (Kéo xô)

🤝 **Vai:**
• Overhead Press (Đẩy tạ qua đầu)`

    schedule = `**LỊCH TẬP GỢI Ý:**
• 3-4 buổi/tuần
• Tập toàn thân mỗi buổi
• Cardio: Chỉ 10-15 phút nhẹ (hoặc không)`
  } else if (goal === 'lose_weight') {
    title = '🥈 CHƯƠNG TRÌNH GIẢM CÂN (Đốt Mỡ)'
    objective = 'Tăng tiêu hao calo, duy trì nhịp tim cao và bảo toàn cơ bắp'
    principles = `**NGUYÊN TẮC TẬP:**
• Tạ trung bình (tập trung kỹ thuật)
• Nhiều lần lặp: 12-15 reps/hiệp
• Hiệp vừa phải: 3 hiệp/bài
• Nghỉ ngắn: 30-60s để duy trì nhịp tim
• Kết hợp tạ + cardio/HIIT`

    exercises = `**BÀI TẬP CHÍNH:**
🔥 **Tập Tạ Đốt Mỡ:**
• Squat, Lunge (tạ nhẹ, nhiều lần)
• Leg Extension (Đá đùi trước)
• Dumbbell Fly (Ép ngực tạ đơn)

⚡ **Circuit Training:**
• Burpees → Squat → Push-ups → Jump Rope
(3-4 bài liên tiếp không nghỉ)

🏃‍♀️ **Cardio Đốt Mỡ:**
• HIIT: 30s tập hết sức + 60s nghỉ
• LISS: Đi bộ dốc/đạp xe 45-60 phút`

    schedule = `**LỊCH TẬP GỢI Ý:**
• 4-5 buổi/tuần
• 3 buổi tạ + 2-3 buổi cardio
• Hoặc tập circuit training`
  } else {
    // build_muscle
    title = '🥉 CHƯƠNG TRÌNH TĂNG CƠ (Hypertrophy)'
    objective = 'Tối đa hóa kích thước cơ bắp qua tổn thương cơ có kiểm soát'
    principles = `**NGUYÊN TẮC TẬP:**
• Tạ nặng vừa (đến gần mức thất bại)
• Lần lặp trung bình: 8-12 reps/hiệp
• Nhiều hiệp: 3-4 hiệp/bài
• Nghỉ trung bình: 60-90s
• Kết hợp Compound + Isolation`

    exercises = `**BÀI TẬP ĐA DẠNG:**
🦵 **Chân/Mông:**
• Squat, Leg Press, Romanian Deadlift
• Leg Extension/Curl

💪 **Ngực:**
• Bench Press, Incline Bench Press
• Pec Deck Fly (Ép ngực máy)

🏃 **Lưng:**
• Barbell Row, Lat Pulldown
• Seated Cable Row

🤝 **Vai:**
• Overhead Press
• Lateral Raise (Nâng tạ sang ngang)

💪 **Tay:**
• Concentration Curl, Tricep Pushdown`

    schedule = `**LỊCH TẬP GỢI Ý:**
• 4-6 buổi/tuần
• Push-Pull-Legs hoặc Upper-Lower
• Cardio: 2-3 lần/tuần, không quá 20 phút`
  }

  return {
    content: `${title}

**🎯 Mục tiêu:** ${objective}

${principles}

${exercises}

${schedule}

💡 **ELITE FITNESS hỗ trợ bạn:**
• PT cá nhân để hướng dẫn kỹ thuật
• Thiết bị hiện đại cho mọi bài tập
• Theo dõi tiến độ và điều chỉnh

Bạn muốn đăng ký PT để được hướng dẫn chi tiết không?`,
    type: 'workout_advice',
    data: {
      goal,
      title,
      objective,
    },
  }
}

const handleUnknown = () => {
  return {
    content:
      '🤔 Tôi chưa hiểu câu hỏi của bạn.\n\nBạn có thể hỏi về:\n• Cơ sở gym\n• Gói membership\n• Lớp học\n• Trainer\n• Thiết bị\n• Giờ mở cửa\n\nHoặc nói "xin chào" để bắt đầu!',
    type: 'unknown',
  }
}

export default { handleFAQ }
