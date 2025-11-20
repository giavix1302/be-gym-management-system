import { STATUS_TYPE, USER_TYPES } from '~/utils/constants'
import { staffModel } from '../model/staff.model'
import { userModel } from '~/modules/user/model/user.model'
import { sendOtpService, verifyOtp } from '~/utils/twilio'
import { staffShiftModel } from '../model/staffShift.model'

const signupForStaff = async (reqBody) => {
  try {
    const { phone } = reqBody
    const existingUser = await userModel.getDetailByPhone(phone)

    if (existingUser) {
      return { success: false, message: 'The user already exists' }
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
const verifyForStaff = async (reqBody) => {
  try {
    const {
      phone,
      code,
      fullName,
      email,
      password,
      age,
      dateOfBirth,
      address,
      gender,
      locationId,
      citizenId,
      positionName,
      hourlyRate,
      hoursWorked,
    } = reqBody
    console.log('🚀 ~ verifyForStaff ~ positionName:', positionName)
    console.log('🚀 ~ verifyForStaff ~ code:', code)
    console.log('🚀 ~ verifyForStaff ~ phone:', phone)

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

    // create user staff
    const dataToCreateUser = {
      phone,
      fullName,
      email,
      password,
      age,
      dateOfBirth,
      address,
      gender,
      role: USER_TYPES.STAFF,
      status: STATUS_TYPE.ACTIVE,
    }

    const result = await userModel.createNew(dataToCreateUser)
    // create staff
    const dataToCreateStaff = {
      userId: result.insertedId.toString(),
      locationId,
      citizenId,
      positionName,
      hourlyRate,
      hoursWorked,
    }
    const resultStaff = await staffModel.createNew(dataToCreateStaff)

    const staff = await staffModel.getDetailById(resultStaff.insertedId)

    return {
      success: true,
      message: 'Staff created successfully',
      staff,
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

const getListStaff = async () => {
  try {
    const list = await staffModel.getListWithDetails()

    return {
      success: true,
      message: 'Get list staff successfully',
      staffs: list,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailByUserId = async (staffId) => {
  try {
    const staff = await staffModel.getDetailByUserId(staffId)

    if (!staff) {
      return {
        success: false,
        message: 'Staff not found',
      }
    }

    return {
      success: true,
      message: 'Get staff details successfully',
      staff: staff,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateStaff = async (req) => {
  try {
    const staffId = req.params.id
    const { userId, locationId, citizenId, positionName, hourlyRate, hoursWorked } = req.body

    const updateData = {
      ...req.body,
      ...(hourlyRate && { hourlyRate: parseFloat(hourlyRate) }),
      ...(hoursWorked && { hoursWorked: parseFloat(hoursWorked) }),
      updatedAt: Date.now(),
    }

    console.log('🚀 ~ updateStaff ~ updateData:', updateData)

    const updatedStaff = await staffModel.updateInfo(staffId, updateData.staffInfo)

    if (!updatedStaff) {
      return {
        success: false,
        message: 'Staff update false',
      }
    }

    const updateUser = await userModel.updateInfo(updatedStaff.userId.toString(), updateData.userInfo)

    // Check if staff exists
    if (updatedStaff === null || updateUser === null) {
      return {
        success: false,
        message: 'Staff does not exist.',
      }
    }

    return {
      success: true,
      message: 'Staff updated successfully',
      staff: updatedStaff,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteStaff = async (staffId) => {
  console.log('🚀 ~ deleteStaff ~ staffId:', staffId)
  try {
    // Soft delete - set _destroy flag to true
    const result = await staffModel.deleteStaff(staffId)

    return {
      success: result === 1,
      message: result === 1 ? 'Staff deleted successfully!' : 'Failed to delete staff!',
    }
  } catch (error) {
    throw new Error(error)
  }
}

const hardDeleteStaff = async (staffId) => {
  try {
    // Hard delete - permanently remove from database
    const result = await staffModel.hardDelete(staffId)

    return {
      success: result === 1,
      message: result === 1 ? 'Staff permanently deleted!' : 'Failed to delete staff!',
    }
  } catch (error) {
    throw new Error(error)
  }
}

const handleLogoutStaff = async (staffId) => {
  try {
    const staffInfo = await staffShiftModel.getDetailByStaffId(staffId)
    console.log('🚀 ~ handleLogoutStaff ~ staffInfo:', staffInfo)

    if (!staffInfo) {
      return { success: false, message: 'Staff shift not found!' }
    }

    const { checkinTime } = staffInfo

    const checkoutTime = new Date()
    const checkin = new Date(checkinTime)

    // 👉 Tính số giờ làm
    const diffMs = checkoutTime - checkin
    const hours = (diffMs / (1000 * 60 * 60)).toFixed(2) // dạng "1.75"

    const result = await staffShiftModel.updateInfo(staffId, {
      checkoutTime: checkoutTime.toISOString(),
      hours: parseFloat(hours), // convert lại thành số 1.75
      updatedAt: Date.now(),
    })
    console.log('🚀 ~ handleLogoutStaff ~ result:', result)

    return {
      success: result !== null,
      message: result !== null ? 'Staff logged out!' : 'Failed to logout staff!',
      hours: parseFloat(hours),
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const staffService = {
  signupForStaff,
  verifyForStaff,
  getListStaff,
  getDetailByUserId,
  updateStaff,
  deleteStaff,
  hardDeleteStaff,
  handleLogoutStaff,
}
