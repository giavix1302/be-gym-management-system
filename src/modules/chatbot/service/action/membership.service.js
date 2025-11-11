// action/membership.service.js - Handle membership-related actions

import { subscriptionModel } from '~/modules/subscription/model/subscription.model.js'
import { membershipModel } from '~/modules/membership/model/membership.model.js'
import { userModel } from '~/modules/user/model/user.model.js'
import { paymentService } from '~/modules/payment/service/payment.service.js'
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '~/utils/constants.js'
import { formatPrice, calculateDiscountedPrice } from '~/utils/utils.js'
import { ObjectId } from 'mongodb'

// Entity extraction helpers
const extractMembershipFromEntities = (entities) => {
  const originalText = entities.originalText?.toLowerCase() || ''

  if (originalText.includes('basic') || originalText.includes('cơ bản')) {
    return 'basic'
  }
  if (originalText.includes('premium') || originalText.includes('cao cấp')) {
    return 'premium'
  }
  if (originalText.includes('vip')) {
    return 'vip'
  }

  return entities.membershipType || null
}

// Validation helpers
const getCurrentUserSubscription = async (userId) => {
  try {
    return await subscriptionModel.getActiveSubscriptionByUserId(userId)
  } catch (error) {
    console.error('Get current subscription error:', error)
    return null
  }
}

const validateAndGetMembership = async (membershipChoice) => {
  try {
    const memberships = await membershipModel.getListWithQuantityUser()
    return memberships.find(
      (m) =>
        m.name.toLowerCase().includes(membershipChoice.toLowerCase()) ||
        m.code?.toLowerCase() === membershipChoice.toLowerCase()
    )
  } catch (error) {
    console.error('Validate membership error:', error)
    return null
  }
}

// UI helpers
const showMembershipOptions = async () => {
  try {
    const memberships = await membershipModel.getListWithQuantityUser()

    if (!memberships || memberships.length === 0) {
      return {
        content: 'Hiện tại không có gói membership nào. Vui lòng liên hệ staff!',
        type: 'no_memberships',
        action: 'register_membership',
      }
    }

    let content = '🏋️ CÁC GÓI MEMBERSHIP:\n\n'

    memberships.forEach((membership, index) => {
      content += `${index + 1}. ${membership.name}\n`
      content += `   💰 Giá: ${formatPrice(membership.price)}\n`
      content += `   ⏰ Thời hạn: ${membership.durationMonth} tháng\n`

      if (membership.discount > 0) {
        const discountedPrice = calculateDiscountedPrice(membership.price, membership.discount)
        content += `   🎉 Giảm giá: ${membership.discount}% (${formatPrice(discountedPrice)})\n`
      }

      if (membership.features && membership.features.length > 0) {
        content += `   ✨ Quyền lợi: ${membership.features.slice(0, 3).join(', ')}\n`
      }

      content += '\n'
    })

    content += 'Vui lòng nhập tên gói bạn muốn đăng ký (VD: "Premium")'

    return {
      content,
      type: 'membership_options',
      action: 'register_membership',
      data: { memberships },
    }
  } catch (error) {
    console.error('Show membership options error:', error)
    return {
      content: 'Không thể tải danh sách gói membership. Vui lòng thử lại sau!',
      type: 'error',
      action: 'register_membership',
    }
  }
}

const showMembershipConfirmation = async (membershipDetails, userId) => {
  try {
    const user = await userModel.getDetailById(userId)
    const finalPrice =
      membershipDetails.discount > 0
        ? calculateDiscountedPrice(membershipDetails.price, membershipDetails.discount)
        : membershipDetails.price

    let content = `📋 XÁC NHẬN ĐĂNG KÝ:\n\n`
    content += `👤 Khách hàng: ${user?.fullName || 'N/A'}\n`
    content += `📦 Gói: ${membershipDetails.name}\n`
    content += `💰 Giá gốc: ${formatPrice(membershipDetails.price)}\n`

    if (membershipDetails.discount > 0) {
      content += `🎉 Giảm giá: ${membershipDetails.discount}%\n`
      content += `💳 Giá sau giảm: ${formatPrice(finalPrice)}\n`
    }

    content += `⏰ Thời hạn: ${membershipDetails.durationMonth} tháng\n\n`

    if (membershipDetails.features && membershipDetails.features.length > 0) {
      content += `✨ QUYỀN LỢI:\n`
      membershipDetails.features.forEach((feature) => {
        content += `• ${feature}\n`
      })
      content += '\n'
    }

    content += `📝 Nhập "Xác nhận" để tiếp tục thanh toán hoặc "Hủy" để chọn gói khác.`

    return {
      content,
      type: 'membership_confirmation',
      action: 'register_membership',
      data: { membershipDetails, finalPrice },
    }
  } catch (error) {
    console.error('Show membership confirmation error:', error)
    return {
      content: 'Không thể hiển thị thông tin xác nhận. Vui lòng thử lại!',
      type: 'error',
      action: 'register_membership',
    }
  }
}

// Payment helpers
const createSubscriptionAndPaymentLink = async (membershipDetails, userId) => {
  try {
    const finalPrice =
      membershipDetails.discount > 0
        ? calculateDiscountedPrice(membershipDetails.price, membershipDetails.discount)
        : membershipDetails.price

    // Create subscription record
    const subscriptionData = {
      userId: new ObjectId(userId),
      membershipId: new ObjectId(membershipDetails._id),
      price: finalPrice,
      originalPrice: membershipDetails.price,
      discount: membershipDetails.discount || 0,
      durationMonth: membershipDetails.durationMonth,
      status: SUBSCRIPTION_STATUS.PENDING,
      startDate: null, // Will be set when payment is confirmed
      endDate: null,
    }

    const subscriptionResult = await subscriptionModel.createNew(subscriptionData)

    if (!subscriptionResult.insertedId) {
      return {
        success: false,
        error: 'Không thể tạo subscription record',
      }
    }

    // Create payment link
    const paymentData = {
      subscriptionId: subscriptionResult.insertedId,
      userId: new ObjectId(userId),
      amount: finalPrice,
      description: `Thanh toán gói ${membershipDetails.name}`,
      returnUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    }

    const paymentResult = await paymentService.createPaymentLink(paymentData)

    if (!paymentResult.success) {
      // Rollback subscription
      await subscriptionModel.softDeleteSubscription(subscriptionResult.insertedId)
      return {
        success: false,
        error: paymentResult.message || 'Không thể tạo link thanh toán',
      }
    }

    return {
      success: true,
      subscriptionId: subscriptionResult.insertedId,
      paymentUrl: paymentResult.paymentUrl,
      paymentId: paymentResult.paymentId,
    }
  } catch (error) {
    console.error('Create subscription and payment error:', error)
    return {
      success: false,
      error: 'Lỗi hệ thống khi tạo thanh toán',
    }
  }
}

// Check membership status
export const handleCheckMembership = async (userId) => {
  try {
    const subscription = await getCurrentUserSubscription(userId)

    if (!subscription) {
      const availableMemberships = await membershipModel.getListWithQuantityUser()

      let content = '📋 BẠN CHƯA CÓ GÓI MEMBERSHIP\n\n'
      content += 'Để tham gia các hoạt động gym, bạn cần đăng ký gói membership.\n\n'

      if (availableMemberships && availableMemberships.length > 0) {
        content += 'GÓI PHỔ BIẾN:\n'
        availableMemberships.slice(0, 2).forEach((membership) => {
          content += `• ${membership.name}: ${formatPrice(membership.price)}/${membership.durationMonth} tháng\n`
        })
        content += '\nNhập "Đăng ký gói" để xem chi tiết!'
      }

      return {
        content,
        type: 'no_membership',
        action: 'check_membership',
      }
    }

    // Get membership details
    const membership = await membershipModel.getDetailById(subscription.membershipId)
    const user = await userModel.getDetailById(userId)

    const now = new Date()
    const endDate = new Date(subscription.endDate)
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))

    let content = `👤 THÔNG TIN MEMBERSHIP:\n\n`
    content += `Khách hàng: ${user?.fullName || 'N/A'}\n`
    content += `📦 Gói hiện tại: ${membership?.name || 'N/A'}\n`
    content += `💰 Giá trị: ${formatPrice(subscription.price)}\n`

    if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
      content += `✅ Trạng thái: ACTIVE\n`
      content += `📅 Hết hạn: ${endDate.toLocaleDateString('vi-VN')}\n`

      if (daysLeft > 0) {
        content += `⏰ Còn lại: ${daysLeft} ngày\n\n`

        if (daysLeft <= 7) {
          content += `⚠️ GÓI SẮP HẾT HẠN!\nVui lòng gia hạn để tiếp tục sử dụng dịch vụ.`
        } else if (daysLeft <= 30) {
          content += `💡 Bạn có muốn gia hạn sớm để nhận ưu đãi không?`
        }
      } else {
        content += `❌ GÓI ĐÃ HẾT HẠN!\nVui lòng gia hạn ngay để tiếp tục sử dụng.`
      }
    } else {
      content += `⏳ Trạng thái: ${subscription.status.toUpperCase()}\n`

      if (subscription.status === SUBSCRIPTION_STATUS.PENDING) {
        content += `💳 Vui lòng hoàn tất thanh toán để kích hoạt gói.`
      }
    }

    return {
      content,
      type: 'membership_info',
      action: 'check_membership',
      data: { subscription, membership, daysLeft },
    }
  } catch (error) {
    console.error('Check membership error:', error)
    return {
      content: 'Không thể kiểm tra thông tin membership. Vui lòng thử lại sau!',
      type: 'error',
      action: 'check_membership',
    }
  }
}

// Main membership registration handler
export const handleRegisterMembership = async (entities, userId) => {
  try {
    // Step 1: Check if user already has active subscription
    const currentSubscription = await getCurrentUserSubscription(userId)

    if (currentSubscription && currentSubscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
      const daysLeft = Math.ceil((new Date(currentSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24))
      return {
        content: `Bạn đang có gói membership ACTIVE còn ${daysLeft} ngày.\n\nVui lòng đợi hết hạn hoặc liên hệ staff để được hỗ trợ gia hạn!`,
        type: 'action_failed',
        action: 'register_membership',
        reason: 'Already has active subscription',
      }
    }

    // Step 2: Check if user selected specific membership
    const membershipChoice = extractMembershipFromEntities(entities)
    if (!membershipChoice) {
      return await showMembershipOptions()
    }

    // Step 3: Get membership details and show confirmation
    const membershipDetails = await validateAndGetMembership(membershipChoice)
    if (!membershipDetails) {
      return {
        content: `Không tìm thấy gói "${membershipChoice}".\n\nVui lòng chọn lại từ danh sách có sẵn!`,
        type: 'action_failed',
        action: 'register_membership',
        reason: 'Invalid membership choice',
      }
    }

    if (!entities.confirmed) {
      return await showMembershipConfirmation(membershipDetails, userId)
    }

    // Step 4: Create subscription and generate payment link
    const result = await createSubscriptionAndPaymentLink(membershipDetails, userId)

    if (result.success) {
      return {
        content: `🎯 ĐẶT HÀNG THÀNH CÔNG!\n\nGói: ${membershipDetails.name}\nGiá: ${formatPrice(
          membershipDetails.price
        )}\nThời hạn: ${membershipDetails.durationMonth} tháng\n\n💳 THANH TOÁN:\n${
          result.paymentUrl
        }\n\n⏰ Link có hiệu lực 10 phút!`,
        type: 'payment_link',
        action: 'register_membership',
        paymentUrl: result.paymentUrl,
        data: { membershipDetails, subscriptionId: result.subscriptionId },
      }
    } else {
      return {
        content: `❌ Không thể tạo link thanh toán: ${result.error}\n\nVui lòng thử lại hoặc liên hệ staff!`,
        type: 'action_failed',
        action: 'register_membership',
        reason: result.error,
      }
    }
  } catch (error) {
    console.error('Register membership error:', error)
    return {
      content: 'Đã xảy ra lỗi khi đăng ký membership. Vui lòng thử lại sau!',
      type: 'error',
      action: 'register_membership',
    }
  }
}

export const membershipService = {
  handleRegisterMembership,
  handleCheckMembership,
  getCurrentUserSubscription,
  showMembershipOptions,
}
