import { STATUS_TYPE, USER_TYPES } from '~/utils/constants'
import { staffModel } from '../model/staff.model'
import { userModel } from '~/modules/user/model/user.model'
import { sendOtpService, verifyOtp } from '~/utils/twilio'
import { staffShiftModel } from '../model/staffShift.model'
import { staffStatisticsModel } from '../model/staffStatistics.model'

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
    console.error('⛔ Verify function error:', error)

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
  console.log('🚀 ~ handleLogoutStaff ~ staffId:', staffId)
  try {
    // staff
    const staffInfo = await staffModel.getDetailById(staffId)
    const { hoursWorked: oldHoursWorked } = staffInfo
    console.log('🚀 ~ handleLogoutStaff ~ oldHoursWorked:', oldHoursWorked)

    //staff shift
    const staffShiftInfo = await staffShiftModel.getDetailByStaffId(staffId)

    if (!staffShiftInfo) {
      return { success: false, message: 'Staff shift not found!' }
    }

    const { checkinTime } = staffShiftInfo

    const checkoutTime = new Date()
    const checkin = new Date(checkinTime)

    // 👉 Tính số giờ làm
    const diffMs = checkoutTime - checkin
    const hours = (diffMs / (1000 * 60 * 60)).toFixed(2) // dạng "1.75"

    const dataToUpdateStaffShift = {
      checkoutTime: checkoutTime.toISOString(),
      hours: parseFloat(hours), // convert lại thành số 1.75
      updatedAt: Date.now(),
    }

    const result = await staffShiftModel.updateInfo(staffShiftInfo._id.toString(), dataToUpdateStaffShift)
    console.log('🚀 ~ handleLogoutStaff ~ dataToUpdateStaffShift.hours:', dataToUpdateStaffShift.hours)
    // tinh tong so gio lam cua staff
    const updateHoursWorked = {
      hoursWorked: Number((oldHoursWorked + dataToUpdateStaffShift.hours).toFixed(2)),
      updatedAt: Date.now(),
    }
    console.log('🚀 ~ handleLogoutStaff ~ updateHoursWorked:', updateHoursWorked.hoursWorked)

    await staffModel.updateInfo(staffId, updateHoursWorked)

    return {
      success: result !== null,
      message: result !== null ? 'Staff logged out!' : 'Failed to logout staff!',
      hours: parseFloat(hours),
    }
  } catch (error) {
    throw new Error(error)
  }
}

// ==================== STAFF STATISTICS FUNCTIONS ====================

/**
 * Lấy tổng quan thống kê nhân viên (4 cards)
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Object} Dữ liệu tổng quan
 */
const getStaffOverview = async (startDate = null, endDate = null) => {
  try {
    // Parse dates if provided as strings
    const parsedStartDate = startDate ? new Date(startDate) : null
    const parsedEndDate = endDate ? new Date(endDate) : null

    const [totalStaff, staffPresentToday, totalWorkingHours, totalSalaryCost] = await Promise.all([
      staffStatisticsModel.getTotalStaff(),
      staffStatisticsModel.getStaffPresentToday(parsedStartDate, parsedEndDate),
      staffStatisticsModel.getTotalWorkingHours(parsedStartDate, parsedEndDate),
      staffStatisticsModel.getTotalSalaryCost(parsedStartDate, parsedEndDate),
    ])

    return {
      success: true,
      message: 'Get staff overview successfully',
      data: {
        totalStaff,
        staffPresentToday,
        totalWorkingHours: Number((totalWorkingHours || 0).toFixed(2)),
        totalSalaryCost: Number((totalSalaryCost || 0).toFixed(2)),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy biểu đồ số giờ làm việc theo nhân viên
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {number} limit - Số lượng nhân viên (default: 10)
 * @returns {Object} Dữ liệu biểu đồ
 */
const getWorkingHoursByStaff = async (startDate = null, endDate = null, limit = 10) => {
  try {
    const parsedStartDate = startDate ? new Date(startDate) : null
    const parsedEndDate = endDate ? new Date(endDate) : null

    const data = await staffStatisticsModel.getWorkingHoursByStaff(parsedStartDate, parsedEndDate, limit)

    return {
      success: true,
      message: 'Get working hours by staff successfully',
      data: data.map((item) => ({
        staffId: item._id,
        staffName: item.staffName,
        totalHours: Number((item.totalHours || 0).toFixed(2)),
        hourlyRate: item.hourlyRate,
        locationId: item.locationId,
      })),
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy xu hướng check-in theo thời gian
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {string} groupBy - Nhóm theo: 'day', 'week', 'month'
 * @returns {Object} Dữ liệu xu hướng
 */
const getCheckinTrend = async (startDate = null, endDate = null, groupBy = 'day') => {
  try {
    const parsedStartDate = startDate ? new Date(startDate) : null
    const parsedEndDate = endDate ? new Date(endDate) : null

    const data = await staffStatisticsModel.getCheckinTrend(parsedStartDate, parsedEndDate, groupBy)

    return {
      success: true,
      message: 'Get checkin trend successfully',
      data: data.map((item) => ({
        period: item._id,
        checkinCount: item.checkinCount,
        date: item.date,
      })),
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy top nhân viên làm việc nhiều nhất
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {number} limit - Số lượng top nhân viên (default: 10)
 * @returns {Object} Top nhân viên
 */
const getTopWorkingStaff = async (startDate = null, endDate = null, limit = 10) => {
  try {
    const parsedStartDate = startDate ? new Date(startDate) : null
    const parsedEndDate = endDate ? new Date(endDate) : null

    const data = await staffStatisticsModel.getTopWorkingStaff(parsedStartDate, parsedEndDate, limit)

    return {
      success: true,
      message: 'Get top working staff successfully',
      data: data.map((item) => ({
        staffId: item._id,
        staffName: item.staffName,
        totalHours: Number((item.totalHours || 0).toFixed(2)),
        hourlyRate: item.hourlyRate,
        totalSalary: Number((item.totalSalaryCost || 0).toFixed(2)), // Sửa từ totalSalary thành totalSalaryCost
      })),
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy chi phí lương theo location
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Object} Chi phí lương theo location
 */
const getSalaryCostByLocation = async (startDate = null, endDate = null) => {
  try {
    const parsedStartDate = startDate ? new Date(startDate) : null
    const parsedEndDate = endDate ? new Date(endDate) : null

    const data = await staffStatisticsModel.getSalaryCostByLocation(parsedStartDate, parsedEndDate)

    return {
      success: true,
      message: 'Get salary cost by location successfully',
      data: data.map((item) => ({
        locationId: item._id,
        locationName: item.locationName,
        totalCost: Number((item.totalCost || 0).toFixed(2)),
        totalHours: Number((item.totalHours || 0).toFixed(2)),
        staffCount: item.staffCount,
      })),
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy thống kê tổng quan cá nhân của nhân viên (3 cards)
 * @param {string} staffId - ID của staff
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Object} Dữ liệu 3 cards
 */
const getMyStatistics = async (staffId, startDate = null, endDate = null) => {
  try {
    const parsedStartDate = startDate ? new Date(startDate) : null
    const parsedEndDate = endDate ? new Date(endDate) : null

    const statistics = await staffShiftModel.getStaffStatistics(staffId, parsedStartDate, parsedEndDate)

    return {
      success: true,
      message: 'Get my statistics successfully',
      data: {
        totalHours: Number((statistics.totalHours || 0).toFixed(2)),
        totalShifts: statistics.totalShifts || 0,
        totalIncome: Number((statistics.totalIncome || 0).toFixed(0)),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy biểu đồ giờ làm việc cá nhân
 * @param {string} staffId - ID của staff
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {string} groupBy - 'day' | 'week' | 'month'
 * @returns {Object} Dữ liệu biểu đồ
 */
const getMyWorkingHoursChart = async (staffId, startDate = null, endDate = null, groupBy = 'week') => {
  try {
    const parsedStartDate = startDate ? new Date(startDate) : null
    const parsedEndDate = endDate ? new Date(endDate) : null

    const data = await staffShiftModel.getWorkingHoursChart(staffId, parsedStartDate, parsedEndDate, groupBy)

    return {
      success: true,
      message: 'Get my working hours chart successfully',
      data: data.map((item) => ({
        period: item.period,
        totalHours: item.totalHours,
        shiftCount: item.shiftCount,
      })),
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy biểu đồ thu nhập cá nhân
 * @param {string} staffId - ID của staff
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {string} groupBy - 'day' | 'week' | 'month'
 * @returns {Object} Dữ liệu biểu đồ thu nhập
 */
const getMyIncomeChart = async (staffId, startDate = null, endDate = null, groupBy = 'week') => {
  try {
    const parsedStartDate = startDate ? new Date(startDate) : null
    const parsedEndDate = endDate ? new Date(endDate) : null

    const data = await staffShiftModel.getIncomeChart(staffId, parsedStartDate, parsedEndDate, groupBy)

    return {
      success: true,
      message: 'Get my income chart successfully',
      data: data.map((item) => ({
        period: item.period,
        totalHours: item.totalHours,
        income: item.income,
      })),
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
  // Statistics functions (Admin)
  getStaffOverview,
  getWorkingHoursByStaff,
  getCheckinTrend,
  getTopWorkingStaff,
  getSalaryCostByLocation,
  // Personal statistics functions (Staff)
  getMyStatistics,
  getMyWorkingHoursChart,
  getMyIncomeChart,
}
