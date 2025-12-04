/* eslint-disable indent */
// personal.service.js - Handle personal information queries (membership, schedule)

import { subscriptionModel } from '~/modules/subscription/model/subscription.model.js'
import { membershipModel } from '~/modules/membership/model/membership.model.js'
import { bookingModel } from '~/modules/booking/model/booking.model.js'
import { classSessionModel } from '~/modules/classSession/model/classSession.model.js'
import { classModel } from '~/modules/class/model/class.model.js'
import { trainerModel } from '~/modules/trainer/model/trainer.model.js'
import { userModel } from '~/modules/user/model/user.model.js'
import { formatPrice } from '~/utils/utils.js'
import { SUBSCRIPTION_STATUS } from '~/utils/constants.js'

// Main personal info handler
export const handlePersonalInfo = async (specificIntent, userId) => {
  try {
    switch (specificIntent) {
      case 'my_membership':
      case 'check_membership':
        return await handleMyMembership(userId)

      case 'my_schedule':
      case 'check_schedule':
        return await handleMySchedule(userId)

      default:
        return await handleMyMembership(userId) // Default to membership info
    }
  } catch (error) {
    console.error('Personal info handler error:', error)
    return {
      content: 'Xin lỗi, không thể lấy thông tin cá nhân. Vui lòng thử lại sau!\n\n📞 Liên hệ: 1900-1234',
      type: 'error',
    }
  }
}

// Handle user's membership information
const handleMyMembership = async (userId) => {
  try {
    // Get user info
    const user = await userModel.getDetailById(userId)
    if (!user) {
      return {
        content:
          'Kính chào Quý khách!\n\nHiện tại không thể tìm thấy thông tin tài khoản. Vui lòng đăng nhập lại để sử dụng dịch vụ.\n\nTrân trọng cảm ơn!',
        type: 'user_not_found',
      }
    }

    // Get active subscription
    const subscription = await subscriptionModel.getActiveSubscriptionByUserId(userId)

    if (!subscription) {
      // No subscription found
      const availableMemberships = await membershipModel.getListWithQuantityUser()

      let content = `Kính chào anh/chị ${user.fullName}!\n\n`
      content += '📋 THÔNG TIN GÓI MEMBERSHIP\n\n'
      content += 'Hiện tại anh/chị chưa có gói membership nào đang hoạt động.\n\n'
      content +=
        'Để tham gia các hoạt động tập luyện tại Elite Fitness, anh/chị cần đăng ký gói membership phù hợp.\n\n'

      if (availableMemberships && availableMemberships.length > 0) {
        content += 'CÁC GÓI PHỔ BIẾN:\n'
        availableMemberships.slice(0, 3).forEach((membership) => {
          content += `• ${membership.name}: ${formatPrice(membership.price)} cho ${membership.durationMonth} tháng\n`
        })
        content += '\n💡 Liên hệ đội ngũ tư vấn để đăng ký: 1900-1234\n\n'
        content += 'Đội ngũ Elite Fitness luôn sẵn sàng hỗ trợ anh/chị!\n\nTrân trọng.'
      }

      return {
        content,
        type: 'no_membership',
        data: { hasSubscription: false, user },
      }
    }

    // Get membership details
    const membership = await membershipModel.getDetailById(subscription.membershipId)

    const now = new Date()
    const endDate = new Date(subscription.endDate)
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))

    let content = `Kính chào anh/chị ${user.fullName}!\n\n`
    content += `👤 THÔNG TIN GÓI MEMBERSHIP\n\n`
    content += `Họ và tên: ${user.fullName}\n`
    content += `📱 Số điện thoại: ${user.phone}\n`
    content += `📦 Gói đang sử dụng: ${membership?.name || 'N/A'}\n`

    if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
      content += `✅ Trạng thái: Đang hoạt động\n`
      content += `📅 Ngày hết hạn: ${endDate.toLocaleDateString('vi-VN')}\n`

      if (daysLeft > 0) {
        content += `⏰ Thời gian còn lại: ${daysLeft} ngày\n\n`

        if (daysLeft <= 7) {
          content += `⚠️ GÓI MEMBERSHIP SẮP HẾT HẠN!\n\nĐể tiếp tục sử dụng các dịch vụ tại Elite Fitness, anh/chị vui lòng liên hệ gia hạn gói membership.\n\n📞 Hotline hỗ trợ: 1900-1234\n\nTrân trọng cảm ơn!`
        } else if (daysLeft <= 30) {
          content += `💡 Anh/chị có muốn gia hạn sớm để nhận các ưu đãi đặc biệt không?\n\n📞 Liên hệ tư vấn: 1900-1234\n\nChúng tôi luôn sẵn sàng hỗ trợ anh/chị!\n\nTrân trọng.`
        } else {
          content += `🎯 Anh/chị có thể tận hưởng đầy đủ các tiện ích:\n• Tập luyện không giới hạn tại tất cả cơ sở\n• Tham gia các lớp học nhóm\n• Đặt lịch tập cá nhân với huấn luyện viên\n• Sử dụng đầy đủ tiện ích phòng gym\n\nChúc anh/chị có những buổi tập hiệu quả!\n\nTrân trọng.`
        }
      } else {
        content += `❌ GÓI MEMBERSHIP ĐÃ HẾT HẠN!\n\nĐể tiếp tục sử dụng dịch vụ, anh/chị vui lòng liên hệ gia hạn ngay.\n\n📞 Hotline hỗ trợ: 1900-1234\n\nChúng tôi xin lỗi về sự bất tiện này!\n\nTrân trọng cảm ơn.`
      }
    } else if (subscription.status === SUBSCRIPTION_STATUS.PENDING) {
      content += `⏳ Trạng thái: Chờ thanh toán\n\n`
      content += `💳 Anh/chị vui lòng hoàn tất thanh toán để kích hoạt gói membership.\n\n📞 Hỗ trợ thanh toán: 1900-1234\n\nTrân trọng cảm ơn!`
    } else {
      content += `⏸️ Trạng thái: ${subscription.status.toUpperCase()}\n\n📞 Vui lòng liên hệ đội ngũ hỗ trợ: 1900-1234\n\nTrân trọng cảm ơn!`
    }

    return {
      content,
      type: 'membership_info',
      data: {
        subscription,
        membership,
        daysLeft,
        user,
        hasSubscription: true,
        isActive: subscription.status === SUBSCRIPTION_STATUS.ACTIVE,
      },
    }
  } catch (error) {
    console.error('Get membership error:', error)
    return {
      content:
        'Kính chào Quý khách!\n\nHiện tại hệ thống gặp sự cố kỹ thuật, không thể kiểm tra thông tin membership. Vui lòng thử lại sau ít phút hoặc liên hệ hotline để được hỗ trợ.\n\n📞 Hotline: 1900-1234\n\nChúng tôi xin lỗi về sự bất tiện này!\n\nTrân trọng cảm ơn.',
      type: 'membership_error',
    }
  }
}

// ✅ Helper function để filter events trong 7 ngày tới
const filterNext7DaysEvents = (events) => {
  const now = new Date()
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return events.filter((event) => {
    const eventDate = new Date(event.startTime)
    return eventDate >= now && eventDate <= next7Days
  })
}

// ✅ Helper function để format ngày theo tiếng Việt
const formatVietnameseDate = (dateString) => {
  try {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    // Check if it's today or tomorrow
    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Ngày mai'
    }

    // Otherwise format as full date
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch (error) {
    return 'N/A'
  }
}

// ✅ Helper function để format giờ
const formatTime = (dateString) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch (error) {
    return 'N/A'
  }
}

// ✅ Helper function để group events theo ngày
const groupEventsByDate = (events) => {
  const grouped = {}

  events.forEach((event) => {
    const dateKey = new Date(event.startTime).toDateString()
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(event)
  })

  // Sort by date
  const sortedKeys = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b))
  const sortedGrouped = {}
  sortedKeys.forEach((key) => {
    sortedGrouped[key] = grouped[key].sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
  })

  return sortedGrouped
}

// Handle user's schedule information - ✅ UPDATED to use getUserEventsForThreeMonths
const handleMySchedule = async (userId) => {
  try {
    // Get user info
    const user = await userModel.getDetailById(userId)
    if (!user) {
      return {
        content:
          'Kính chào Quý khách!\n\nHiện tại không thể tìm thấy thông tin tài khoản. Vui lòng đăng nhập lại để sử dụng dịch vụ.\n\nTrân trọng cảm ơn!',
        type: 'user_not_found',
      }
    }

    // Check if user has active subscription
    const subscription = await subscriptionModel.getActiveSubscriptionByUserId(userId)
    if (!subscription || subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
      return {
        content: `Kính chào anh/chị ${user.fullName}!\n\n📅 LỊCH TẬP CÁ NHÂN\n\n⚠️ Để xem lịch tập chi tiết, anh/chị cần có gói membership đang hoạt động.\n\nVui lòng liên hệ với đội ngũ tư vấn để được hỗ trợ kích hoạt gói membership.\n\n📞 Hotline hỗ trợ: 1900-1234\n\nTrân trọng cảm ơn anh/chị!`,
        type: 'no_active_membership',
      }
    }

    // ✅ UPDATED: Sử dụng getUserEventsForThreeMonths và filter 7 ngày tới
    let allEvents = []
    try {
      const schedule3months = await userModel.getUserEventsForThreeMonths(userId)

      // Filter chỉ lấy 7 ngày tới
      allEvents = filterNext7DaysEvents(schedule3months)
    } catch (error) {
      console.error('🚫 Error fetching events:', error)
      allEvents = []
    }

    let content = `Kính chào anh/chị ${user.fullName}!\n\n📅 LỊCH TẬP 7 NGÀY TỚI\n\n`

    if (allEvents.length === 0) {
      content += `📝 Hiện tại anh/chị chưa có lịch hẹn nào trong 7 ngày tới.\n\n`
      content += `💪 Anh/chị có thể:\n`
      content += `• Đặt lịch tập cá nhân với Huấn luyện viên\n`
      content += `• Đăng ký tham gia các lớp học nhóm\n`
      content += `• Tập luyện tự do trong giờ hoạt động của phòng gym\n\n`
      content += `📞 Đặt lịch: 1900-1234\n`
      content += `⏰ Giờ hoạt động: 06:00 - 22:00 (Thứ Hai - Chủ Nhật)\n\n`
      content += `Đội ngũ Elite Fitness luôn sẵn sàng hỗ trợ anh/chị!\n\nTrân trọng cảm ơn.`
    } else {
      // ✅ Group events by date for better display
      const groupedEvents = groupEventsByDate(allEvents)

      content += `Danh sách lịch hẹn của anh/chị:\n\n`

      Object.entries(groupedEvents).forEach(([dateKey, dayEvents]) => {
        const formattedDate = formatVietnameseDate(dayEvents[0].startTime)
        content += `📅 ${formattedDate}:\n`

        dayEvents.forEach((event, index) => {
          const startTime = formatTime(event.startTime)
          const endTime = formatTime(event.endTime)

          content += `   ${index + 1}. ${startTime} - ${endTime}\n`

          // Format title more elegantly
          if (event.title) {
            // Remove redundant parts from title for cleaner display
            let cleanTitle = event.title
              .replace(/PT\s+/i, '')
              .replace(/Huấn luyện 1 kèm 1 cùng.*$/, 'Tập luyện cá nhân')
            content += `      🎯 ${cleanTitle}\n`
          }

          if (event.trainerName) {
            content += `      👨‍💪 Huấn luyện viên: ${event.trainerName}\n`
          }

          if (event.locationName) {
            content += `      📍 Địa điểm: ${event.locationName}\n`
          }

          if (event.roomName) {
            content += `      🏠 Phòng: ${event.roomName}\n`
          }

          content += '\n'
        })
      })

      const totalEvents = allEvents.length
      const bookingEvents = allEvents.filter((e) => e.eventType === 'booking')
      const classEvents = allEvents.filter((e) => e.eventType === 'classSession')

      content += `📊 Tổng kết:\n`
      content += `• Tổng số buổi tập: ${totalEvents}\n`
      if (bookingEvents.length > 0) {
        content += `• Tập cá nhân với trainer: ${bookingEvents.length} buổi\n`
      }
      if (classEvents.length > 0) {
        content += `• Lớp học nhóm: ${classEvents.length} buổi\n`
      }

      content += `\n📞 Thay đổi lịch: 1900-1234`
      content += `\n⏰ Giờ hoạt động gym: 06:00 - 22:00 (Thứ Hai - Chủ Nhật)`
      content += `\n\nChúc anh/chị có những buổi tập hiệu quả!\n\nTrân trọng.`
    }

    return {
      content,
      type: 'schedule_info',
      data: {
        upcomingEvents: allEvents,
        totalSchedules: allEvents.length,
        user,
        hasActiveSubscription: true,
        next7DaysEvents: allEvents,
        debug: {
          eventsCount: allEvents.length,
          eventsGrouped: groupEventsByDate(allEvents),
        },
      },
    }
  } catch (error) {
    console.error('Get schedule error:', error)
    return {
      content:
        'Kính chào Quý khách!\n\nHiện tại hệ thống gặp sự cố kỹ thuật, không thể tải lịch tập. Vui lòng thử lại sau ít phút hoặc liên hệ hotline để được hỗ trợ.\n\n📞 Hotline: 1900-1234\n\nChúng tôi xin lỗi về sự bất tiện này!\n\nTrân trọng cảm ơn.',
      type: 'schedule_error',
    }
  }
}

// Helper function to get upcoming dates
const getUpcomingDates = (days = 7) => {
  const dates = []
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date)
  }

  return dates
}

export const personalService = {
  handlePersonalInfo,
  handleMyMembership,
  handleMySchedule,
}

export default {
  handlePersonalInfo,
  handleMyMembership,
  handleMySchedule,
}
