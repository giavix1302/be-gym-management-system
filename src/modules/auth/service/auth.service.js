import { sendOtpService, verifyOtp } from '~/utils/twilio.js'
import { handleHashedPassword, isMatch } from '~/utils/bcrypt.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '~/utils/jwt.js'
import { saveUserTemp, getUserTemp } from '~/utils/redis.js'
import { userModel } from '~/modules/user/model/user.model.js'
import { sanitize } from '~/utils/utils.js'
import { subscriptionService } from '~/modules/subscription/service/subscription.service'
import { trainerService } from '~/modules/trainer/service/trainer.service'
import { STATUS_TYPE } from '~/utils/constants'
import { cloudinary } from '~/config/cloudinary.config'
import QRCode from 'qrcode'
import { staffModel } from '~/modules/staff/model/staff.model'
import { staffShiftModel } from '~/modules/staff/model/staffShift.model'

const login = async (reqBody) => {
  try {
    const { phone, password } = reqBody

    // check user in DB
    const account = await userModel.getDetailByPhone(phone)
    if (!account) {
      return { success: false, message: 'The account does not exist.' }
    }

    // check password
    const match = await isMatch(password, account.password)
    if (!match) {
      return { success: false, message: 'Incorrect phone or password.' }
    }

    // generate tokens
    const payload = { userId: account._id, role: account.role }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    // ---- get myMembership ----
    // name membership
    // durationMonth membership
    // total check in
    // startDate subscription
    // endDate subscription
    // remainingSessions subscription

    // user
    if (account.role === 'user') {
      const subscriptionInfo = await subscriptionService.getSubDetailByUserId(account._id)

      if (!subscriptionInfo.success)
        return {
          success: true,
          message: 'Signed in successfully.',
          user: sanitize(account),
          myMembership: {
            remainingSessions: 0,
            startDate: '',
            endDate: '',
            status: '',
            name: '',
            durationMonth: 0,
            bannerURL: '',
            totalCheckin: 0,
          },
          accessToken,
          refreshToken, // controller sẽ set cookie
        }

      const { remainingSessions, startDate, endDate, status, name, durationMonth, bannerURL } =
        subscriptionInfo.subscription

      return {
        success: true,
        message: 'Signed in successfully.',
        user: sanitize(account),
        myMembership: {
          remainingSessions,
          startDate,
          endDate,
          status,
          name,
          durationMonth,
          bannerURL,
          totalCheckin: 0, // làm sau
        },
        accessToken,
        refreshToken, // controller sẽ set cookie
      }
    }

    if (account.role === 'pt') {
      const trainerInfo = await trainerService.getDetailByUserId(account._id)

      return {
        success: true,
        message: 'Signed in successfully.',
        user: sanitize(account),
        trainer: {
          ...trainerInfo.trainer,
        },
        accessToken,
        refreshToken, // controller sẽ set cookie
      }
    }

    if (account.role === 'staff') {
      // lấy thông tin staff
      const staff = await staffModel.getDetailByUserId(account._id)

      await staffShiftModel.createNew({
        staffId: staff._id.toString(),
        checkinTime: new Date().toISOString(),
      })

      const { locationInfo, userInfo, ...staffInfo } = staff

      return {
        success: true,
        message: 'Signed in successfully.',
        user: sanitize(account),
        staffInfo, // chỉ dữ liệu staff (id, position, rate,...)
        locationInfo,
        accessToken,
        refreshToken, // controller sẽ set cookie
      }
    }

    if (account.role === 'admin') {
      return {
        success: true,
        message: 'Signed in successfully.',
        user: sanitize(account),
        accessToken,
        refreshToken, // controller sẽ set cookie
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

const signup = async (reqBody) => {
  try {
    const { phone, password } = reqBody
    const existingUser = await userModel.getDetailByPhone(phone)

    if (existingUser) {
      return { success: false, message: 'The user already exists' }
    }

    const hashedPassword = await handleHashedPassword(password)
    const userData = { ...reqBody, password: hashedPassword }

    // Production → gửi OTP qua Twilio
    if (process.env.NODE_ENV === 'production') {
      const result = await sendOtpService(phone)
      console.log('🚀 ~ signup ~ result:', result)
      if (!result.success) return { success: false, message: result.message }

      await saveUserTemp(phone, userData)
      return { success: true, message: 'The OTP code has been sent' }
    }

    // Dev → bypass OTP
    if (process.env.NODE_ENV === 'development') {
      await saveUserTemp(phone, userData)
      return { success: true, message: 'The OTP code has been sent' }
    }
  } catch (error) {
    throw new Error(error)
  }
}

const generateAndUploadQRCode = async (user) => {
  try {
    // Verify cloudinary is properly configured
    if (!cloudinary || !cloudinary.uploader) {
      console.error('❌ Cloudinary is not properly configured')
      throw new Error('Cloudinary configuration error')
    }

    // Create QR code data
    const qrData = JSON.stringify({
      userId: user._id,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    })

    // Generate QR code as base64
    const qrImageBase64 = await QRCode.toDataURL(qrData)

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(qrImageBase64, {
      folder: 'gms-qr',
      public_id: `qr_${user._id}`,
      overwrite: true,
    })

    // Update user with QR code URL
    const updatedUser = await userModel.updateInfo(user._id, {
      qrCode: uploadResponse.secure_url,
    })

    return {
      success: true,
      user: updatedUser,
    }
  } catch (error) {
    console.error('❌ QR Code generation/upload error:', error)
    return {
      success: false,
      error: error.message,
      user: user, // Return original user without QR code
    }
  }
}

// Helper function to generate tokens
const generateTokens = (user) => {
  const payload = { userId: user._id, role: user.role }
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  }
}

// Helper function to validate OTP based on environment
const validateOTP = async (phone, code) => {
  if (process.env.NODE_ENV === 'production') {
    return await verifyOtp(phone, code)
  }

  // Development environment
  if (code === '123456') {
    return {
      success: true,
      message: 'Development OTP verified',
    }
  }

  return {
    success: false,
    message: 'Invalid OTP code. Please try again.',
  }
}

// Main verify function
const verify = async (reqBody) => {
  try {
    const { phone, code } = reqBody

    // Validate required fields
    if (!phone || !code) {
      return {
        success: false,
        message: 'Phone number and OTP code are required',
      }
    }

    // Validate OTP
    const otpResult = await validateOTP(phone, code)
    if (!otpResult.success) {
      return {
        success: false,
        message: otpResult.message,
      }
    }

    // Get user data from Redis
    let userData = await getUserTemp(phone)
    if (!userData) {
      return {
        success: false,
        message: 'User data not found. Please restart the registration process.',
      }
    }

    console.log('🚀 ~ verify ~ userData:', userData)

    // Add status field
    userData = {
      ...userData,
      status: STATUS_TYPE.INACTIVE,
    }

    // Create new user
    const createResult = await userModel.createNew(userData)
    if (!createResult || !createResult.insertedId) {
      throw new Error('Failed to create user')
    }

    // Get created user details
    const user = await userModel.getDetailById(createResult.insertedId)
    if (!user) {
      throw new Error('Failed to retrieve created user')
    }

    // Generate QR code (with fallback handling)
    const qrResult = await generateAndUploadQRCode(user)
    const finalUser = qrResult.user

    // Generate authentication tokens
    const tokens = generateTokens(finalUser)

    // Determine response message based on QR code generation
    let message = 'Account created successfully'
    if (!qrResult.success) {
      message = 'Account created successfully (QR code will be generated later)'
      console.warn('⚠️ QR code generation failed:', qrResult.error)
    }

    return {
      success: true,
      message,
      user: sanitize(finalUser),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }
  } catch (error) {
    console.error('❌ Verify function error:', error)

    // Return structured error response
    return {
      success: false,
      message: 'An error occurred during account verification. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }
  }
}

const refresh = async (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken)

    const payload = { userId: decoded.userId, role: decoded.role }
    const accessToken = signAccessToken(payload)

    return { success: true, accessToken }
  } catch (error) {
    return { success: false, message: 'Invalid or expired refresh token' }
  }
}

// forgot password
const forgotPasswordSentOTP = async (reqBody) => {
  try {
    const { phone } = reqBody
    const existingUser = await userModel.getDetailByPhone(phone)

    if (!existingUser) {
      return { success: false, message: 'The user does not exist.' }
    }

    // Production → gửi OTP qua Twilio
    if (process.env.NODE_ENV === 'production') {
      const result = await sendOtpService(phone)
      if (!result.success) return { success: false, message: result.message }
      return { success: true, message: 'The OTP code has been sent' }
    }

    // Dev → bypass OTP
    if (process.env.NODE_ENV === 'development') {
      return { success: true, message: 'The OTP code has been sent' }
    }
  } catch (error) {
    throw new Error(error)
  }
}

const forgotPasswordVerifyOTP = async (reqBody) => {
  try {
    const { phone, code } = reqBody

    // Validate required fields
    if (!phone || !code) {
      return {
        success: false,
        message: 'Phone number and OTP code are required',
      }
    }

    // Validate OTP
    const otpResult = await validateOTP(phone, code)
    if (!otpResult.success) {
      return {
        success: false,
        message: otpResult.message,
      }
    }

    return {
      success: true,
      message: 'OTP verified successfully.',
    }
  } catch (error) {
    console.error('❌ Verify function error:', error)

    // Return structured error response
    return {
      success: false,
      message: 'An error occurred during account verification. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }
  }
}

export const authService = {
  login,
  signup,
  verify,
  refresh,
  forgotPasswordSentOTP,
  forgotPasswordVerifyOTP,
}
