// action/registration.service.js - Handle user registration actions

import { userModel } from '~/modules/user/model/user.model.js'
import { GET_DB } from '~/config/mongodb.config.js'
import { USER_TYPES } from '~/utils/constants.js'
import bcrypt from 'bcrypt'

// Utility functions
const hashPassword = async (plainPassword) => {
  const saltRounds = 10
  return await bcrypt.hash(plainPassword, saltRounds)
}

const validatePhone = (phone) => {
  if (!phone) return false
  const phoneRegex = /^(0[0-9]{9,10}|\+84[0-9]{9,10})$/
  return phoneRegex.test(phone)
}

const validateEmail = (email) => {
  if (!email) return true // Email is optional
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

const validatePassword = (password) => {
  if (!password) return false
  return password.length >= 6
}

// Entity extraction for registration
const extractRegistrationInfo = (entities) => {
  const originalText = entities.originalText || ''
  const extracted = {
    fullName: null,
    email: null,
    phone: null,
    password: null,
    role: null,
  }

  // Extract full name
  const namePatterns = [/(?:tên|họ tên)\s*[:=]?\s*([^,\n]+)/i, /tôi tên\s+([^,\n]+)/i, /mình tên\s+([^,\n]+)/i]

  for (const pattern of namePatterns) {
    const match = originalText.match(pattern)
    if (match) {
      extracted.fullName = match[1].trim()
      break
    }
  }

  // Extract phone number
  const phonePatterns = [
    /(?:sdt|số điện thoại|phone)\s*[:=]?\s*([0-9]{10,11})/i,
    /\b(0[0-9]{9,10})\b/,
    /\b(\+84[0-9]{9,10})\b/,
  ]

  for (const pattern of phonePatterns) {
    const match = originalText.match(pattern)
    if (match) {
      extracted.phone = match[1].trim()
      break
    }
  }

  // Extract email
  const emailPattern = /(?:email|mail)\s*[:=]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
  const emailMatch = originalText.match(emailPattern)
  if (emailMatch) {
    extracted.email = emailMatch[1].trim()
  }

  // Extract password
  const passwordPatterns = [/(?:mật khẩu|password|pass)\s*[:=]?\s*([^\s,\n]+)/i]
  for (const pattern of passwordPatterns) {
    const match = originalText.match(pattern)
    if (match) {
      extracted.password = match[1].trim()
      break
    }
  }

  // Extract role
  const rolePatterns = [/(?:vai trò|role)\s*[:=]?\s*(user|pt|admin|trainer)/i, /\b(user|pt|admin|trainer)\b/i]

  for (const pattern of rolePatterns) {
    const match = originalText.match(pattern)
    if (match) {
      const roleValue = match[1].toLowerCase()
      if (roleValue === 'pt' || roleValue === 'trainer') {
        extracted.role = USER_TYPES.PT
      } else if (roleValue === 'admin') {
        extracted.role = USER_TYPES.ADMIN
      } else {
        extracted.role = USER_TYPES.USER
      }
      break
    }
  }

  return extracted
}

// Registration step determination
const determineRegistrationStep = (entities) => {
  const extracted = extractRegistrationInfo(entities)

  if (extracted.fullName && extracted.phone && extracted.password && extracted.role) {
    return 'create_account'
  }

  if (extracted.fullName || extracted.phone || extracted.password) {
    return 'validate_info'
  }

  return 'collect_info'
}

// Validation functions
const validateUserRegistrationData = (userInfo) => {
  const errors = []

  if (!userInfo.fullName || userInfo.fullName.length < 2) {
    errors.push('Họ tên phải có ít nhất 2 ký tự')
  }

  if (!validatePhone(userInfo.phone)) {
    errors.push('Số điện thoại không hợp lệ (VD: 0901234567)')
  }

  if (userInfo.email && !validateEmail(userInfo.email)) {
    errors.push('Email không hợp lệ')
  }

  if (!validatePassword(userInfo.password)) {
    errors.push('Mật khẩu phải có ít nhất 6 ký tự')
  }

  if (!validateRole(userInfo.role)) {
    errors.push('Vai trò phải là: user, pt, hoặc admin')
  }

  return errors
}

const validateRole = (role) => {
  return Object.values(USER_TYPES).includes(role)
}

const checkExistingUser = async (email, phone) => {
  try {
    const db = await GET_DB()

    const queries = []
    if (email) queries.push({ email })
    if (phone) queries.push({ phone })

    if (queries.length === 0) {
      return { emailExists: false, phoneExists: false }
    }

    const existingUser = await db.collection('users').findOne({
      $or: queries,
      _destroy: false,
    })

    return {
      emailExists: existingUser && existingUser.email === email,
      phoneExists: existingUser && existingUser.phone === phone,
    }
  } catch (error) {
    console.error('Check existing user error:', error)
    return { emailExists: false, phoneExists: false }
  }
}

// UI helpers
const showRegistrationForm = async () => {
  return {
    content:
      'ĐĂNG KÝ TÀI KHOẢN:\n\nVui lòng cung cấp thông tin sau:\n\n• Họ tên: [Tên đầy đủ]\n• Số điện thoại: [0901234567]\n• Email: [email@example.com] (tùy chọn)\n• Mật khẩu: [ít nhất 6 ký tự]\n• Vai trò: [user/pt/admin]\n\nVí dụ: "Tôi tên Nguyễn Văn A, sdt 0901234567, mật khẩu 123456, vai trò user"\n\nVai trò:\n• user - Khách hàng tập gym\n• pt - Personal trainer\n• admin - Quản trị viên',
    type: 'registration_form',
    action: 'register_account',
    requiresInfo: ['fullName', 'phone', 'password', 'role'],
  }
}

const collectUserInfo = async (entities) => {
  const extractedInfo = extractRegistrationInfo(entities)
  const missingFields = []

  if (!extractedInfo.fullName) missingFields.push('Họ tên')
  if (!extractedInfo.phone) missingFields.push('Số điện thoại')
  if (!extractedInfo.password) missingFields.push('Mật khẩu')
  if (!extractedInfo.role) missingFields.push('Vai trò (user/pt/admin)')

  if (missingFields.length > 0) {
    return {
      content: `Thiếu thông tin: ${missingFields.join(
        ', '
      )}\n\nVui lòng cung cấp đầy đủ: họ tên, số điện thoại, mật khẩu và vai trò.`,
      type: 'missing_info',
      action: 'register_account',
      missingFields,
      providedInfo: extractedInfo,
    }
  }

  return await validateUserInfo({ data: extractedInfo })
}

const validateUserInfo = async (entities) => {
  const userInfo = entities.data || extractRegistrationInfo(entities)
  const errors = validateUserRegistrationData(userInfo)

  const existingUser = await checkExistingUser(userInfo.email, userInfo.phone)
  if (existingUser.phoneExists) {
    errors.push('Số điện thoại đã được sử dụng')
  }
  if (userInfo.email && existingUser.emailExists) {
    errors.push('Email đã được sử dụng')
  }

  if (errors.length > 0) {
    return {
      content: `Thông tin không hợp lệ:\n\n${errors
        .map((e) => `• ${e}`)
        .join('\n')}\n\nVui lòng nhập lại thông tin chính xác.`,
      type: 'validation_failed',
      action: 'register_account',
      errors,
    }
  }

  return await showRegistrationConfirmation(userInfo)
}

const showRegistrationConfirmation = async (userInfo) => {
  const roleLabels = {
    [USER_TYPES.USER]: 'Khách hàng',
    [USER_TYPES.PT]: 'Personal Trainer',
    [USER_TYPES.ADMIN]: 'Quản trị viên',
  }

  let content = 'XÁC NHẬN ĐĂNG KÝ:\n\n'
  content += `Họ tên: ${userInfo.fullName}\n`
  content += `Số điện thoại: ${userInfo.phone}\n`

  if (userInfo.email) {
    content += `Email: ${userInfo.email}\n`
  }

  content += `Mật khẩu: ${'*'.repeat(userInfo.password.length)}\n`
  content += `Vai trò: ${roleLabels[userInfo.role] || userInfo.role}\n\n`
  content += 'Nhập "Xác nhận" để tạo tài khoản hoặc "Hủy" để nhập lại.'

  return {
    content,
    type: 'registration_confirmation',
    action: 'register_account',
    data: userInfo,
  }
}

const createUserAccount = async (entities) => {
  try {
    const userInfo = entities.data || extractRegistrationInfo(entities)

    const errors = validateUserRegistrationData(userInfo)
    if (errors.length > 0) {
      return {
        content: `Không thể tạo tài khoản: ${errors.join(', ')}`,
        type: 'creation_failed',
        action: 'register_account',
      }
    }

    const existingUser = await checkExistingUser(userInfo.email, userInfo.phone)
    if (existingUser.phoneExists || (userInfo.email && existingUser.emailExists)) {
      return {
        content: 'Không thể tạo tài khoản: Số điện thoại hoặc email đã được sử dụng.',
        type: 'creation_failed',
        action: 'register_account',
      }
    }

    const hashedPassword = await hashPassword(userInfo.password)

    const userData = {
      fullName: userInfo.fullName,
      phone: userInfo.phone,
      email: userInfo.email || null,
      password: hashedPassword,
      role: userInfo.role,
      isActive: true,
      emailVerified: false,
      phoneVerified: false,
      createdAt: new Date(),
      updatedAt: null,
      _destroy: false,
    }

    const result = await userModel.createNew(userData)

    if (!result.insertedId) {
      return {
        content: 'Không thể tạo tài khoản. Vui lòng thử lại sau!',
        type: 'creation_failed',
        action: 'register_account',
      }
    }

    return {
      content: `TẠO TÀI KHOẢN THÀNH CÔNG!\n\nChào mừng ${userInfo.fullName}!\nSố điện thoại: ${
        userInfo.phone
      }\nVai trò: ${getRoleLabel(
        userInfo.role
      )}\n\nBạn có thể đăng nhập ngay để:\n• Đăng ký gói membership\n• Đặt lịch tập với trainer\n• Tham gia các lớp học\n\nChúc bạn có trải nghiệm tuyệt vời tại gym!`,
      type: 'registration_success',
      action: 'register_account',
      data: {
        userId: result.insertedId,
        userInfo: {
          fullName: userInfo.fullName,
          phone: userInfo.phone,
          role: userInfo.role,
        },
      },
    }
  } catch (error) {
    console.error('Create user account error:', error)
    return {
      content: 'Đã xảy ra lỗi khi tạo tài khoản. Vui lòng thử lại sau!',
      type: 'creation_error',
      action: 'register_account',
    }
  }
}

const getRoleLabel = (role) => {
  const labels = {
    [USER_TYPES.USER]: 'Khách hàng',
    [USER_TYPES.PT]: 'Personal Trainer',
    [USER_TYPES.ADMIN]: 'Quản trị viên',
  }
  return labels[role] || role
}

// Main registration handler
export const handleRegisterAccount = async (entities, userId) => {
  try {
    if (userId) {
      return {
        content:
          'Bạn đã có tài khoản và đang đăng nhập.\n\nBạn có thể sử dụng các tính năng như đăng ký gói tập, đặt lịch trainer ngay!',
        type: 'already_logged_in',
        action: 'register_account',
      }
    }

    const registrationStep = determineRegistrationStep(entities)

    switch (registrationStep) {
      case 'collect_info':
        return await collectUserInfo(entities)

      case 'validate_info':
        return await validateUserInfo(entities)

      case 'create_account':
        return await createUserAccount(entities)

      default:
        return await showRegistrationForm()
    }
  } catch (error) {
    console.error('Register account error:', error)
    return {
      content: 'Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại sau!',
      type: 'error',
      action: 'register_account',
    }
  }
}

// Contact staff handler
export const handleContactStaff = async (entities, userId) => {
  try {
    const user = userId ? await userModel.getDetailById(userId) : null

    let content = 'LIÊN HỆ HỖ TRỢ:\n\n'

    if (user) {
      content += `Xin chào ${user.fullName}!\n\n`
    }

    content += 'THÔNG TIN LIÊN HỆ:\n\n'
    content += 'Hotline: 1900 1234\n'
    content += 'Email: support@gym.com\n'
    content += 'Facebook: fb.com/gymfanpage\n'
    content += 'Website: www.gym.com\n\n'
    content += 'ĐỊA CHỈ CÁC CƠ SỞ:\n'
    content += '• Cơ sở 1: 123 Nguyễn Văn A, Q1, TPHCM\n'
    content += '• Cơ sở 2: 456 Trần Hưng Đạo, Q5, TPHCM\n\n'
    content += 'GIỜ LÀM VIỆC:\n'
    content += '• Thứ 2 - Thứ 6: 8:00 - 22:00\n'
    content += '• Thứ 7 - Chủ nhật: 8:00 - 20:00\n\n'
    content += 'Staff sẽ phản hồi trong vòng 15 phút!'

    return {
      content,
      type: 'contact_info',
      action: 'contact_staff',
    }
  } catch (error) {
    console.error('Contact staff error:', error)
    return {
      content: 'Không thể tải thông tin liên hệ. Vui lòng thử lại sau!',
      type: 'error',
      action: 'contact_staff',
    }
  }
}

export const registrationService = {
  handleRegisterAccount,
  handleContactStaff,
  extractRegistrationInfo,
  validateUserRegistrationData,
  checkExistingUser,
}
