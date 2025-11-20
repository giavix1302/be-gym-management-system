/* eslint-disable indent */
import { attendanceModel } from '../model/attendance.model'
import { userModel } from '~/modules/user/model/user.model'
import { locationModel } from '~/modules/location/model/location.model'
import { sanitize } from '~/utils/utils'
import { ATTENDANCE_METHOD, STATUS_TYPE } from '~/utils/constants'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model'
import { trainerModel } from '~/modules/trainer/model/trainer.model'

// UNIFIED: Toggle checkin/checkout - tự động xử lý based on user state
const toggleAttendance = async (req) => {
  try {
    const { userId, locationId, method = ATTENDANCE_METHOD.QRCODE } = req.body

    // Kiểm tra user tồn tại
    const user = await userModel.getDetailById(userId)
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    if (user.role === 'pt') {
      const subscription = await subscriptionModel.getDetailByUserId(userId)
      const hasSchedules = await trainerModel.hasTrainerSchedules(userId)

      const hasSubscription = !!subscription

      if (!hasSubscription && !hasSchedules) {
        return {
          success: false,
          message: 'The trainer has no packages, no one-on-one schedules, and no class sessions.',
        }
      }
    }

    if (user.status === STATUS_TYPE.INACTIVE) {
      return {
        success: false,
        message: 'User has not registered for a training package or the package has expired.',
      }
    }

    // Kiểm tra location tồn tại
    const location = await locationModel.getDetailById(locationId)
    if (!location) {
      return {
        success: false,
        message: 'Location not found',
      }
    }

    // Tìm attendance active của user trong ngày hôm nay
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const activeAttendance = await attendanceModel.getActiveAttendanceByUserToday(
      userId,
      startOfToday.toISOString(),
      endOfToday.toISOString()
    )

    console.log('🚀 ~ toggleAttendance ~ activeAttendance:', activeAttendance)

    if (activeAttendance) {
      // USER ĐÃ CHECKIN → THỰC HIỆN CHECKOUT
      const checkoutTime = new Date().toISOString()
      const checkinTime = new Date(activeAttendance.checkinTime)
      const checkout = new Date(checkoutTime)

      // Tính số giờ làm việc (làm tròn 2 chữ số thập phân)
      const hours = Math.round(((checkout - checkinTime) / (1000 * 60 * 60)) * 100) / 100

      const updateData = {
        checkoutTime: checkoutTime,
        hours: hours,
        updatedAt: Date.now(),
      }

      const updatedAttendance = await attendanceModel.updateInfo(activeAttendance._id, updateData)

      return {
        success: true,
        action: 'checkout',
        message: 'Checked out successfully',
        attendance: {
          ...sanitize(updatedAttendance),
          user: {
            _id: user._id,
            fullName: user.fullName,
            phone: user.phone,
          },
          location: {
            _id: location._id,
            name: location.name,
            address: location.address,
          },
        },
      }
    } else {
      // USER CHƯA CHECKIN → THỰC HIỆN CHECKIN
      const newAttendanceData = {
        userId: String(userId),
        locationId: String(locationId),
        checkinTime: new Date().toISOString(),
        checkoutTime: '',
        hours: 0,
        method: method,
      }

      try {
        const createdAttendance = await attendanceModel.createNew(newAttendanceData)
        const getNewAttendance = await attendanceModel.getDetail(createdAttendance.insertedId)

        return {
          success: true,
          action: 'checkin',
          message: 'Checked in successfully',
          attendance: {
            ...sanitize(getNewAttendance),
            user: {
              _id: user._id,
              fullName: user.fullName,
              phone: user.phone,
            },
            location: {
              _id: location._id,
              name: location.name,
              address: location.address,
            },
          },
        }
      } catch (createError) {
        // Handle MongoDB duplicate key error (nếu có unique constraint)
        if (createError.message.includes('E11000') || createError.message.includes('duplicate')) {
          console.log('🚫 Duplicate attendance prevented by database constraint')
          return {
            success: false,
            message: 'User already checked in. Duplicate request detected.',
          }
        }

        throw createError
      }
    }
  } catch (error) {
    console.error('Toggle attendance error:', error)
    throw new Error(error)
  }
}

// Existing functions remain unchanged
const getActiveAttendance = async (userId) => {
  try {
    const user = await userModel.getDetailById(userId)
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    const activeAttendance = await attendanceModel.getActiveAttendanceByUser(userId)

    if (!activeAttendance) {
      return {
        success: true,
        message: 'No active attendance',
        attendance: null,
      }
    }

    const location = await locationModel.getDetailById(activeAttendance.locationId)

    return {
      success: true,
      message: 'Active attendance found',
      attendance: {
        ...sanitize(activeAttendance),
        user: {
          _id: user._id,
          fullName: user.fullName,
          phone: user.phone,
        },
        location: {
          _id: location._id,
          name: location.name,
          address: location.address,
        },
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getUserHistory = async (userId, startDate, endDate) => {
  try {
    const user = await userModel.getDetailById(userId)
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    const attendances = await attendanceModel.getUserAttendances(userId, startDate, endDate)

    const attendancesWithDetails = await Promise.all(
      attendances.map(async (attendance) => {
        const location = await locationModel.getDetailById(attendance.locationId)
        return {
          ...sanitize(attendance),
          location: location
            ? {
                _id: location._id,
                name: location.name,
                address: location.address,
              }
            : null,
        }
      })
    )

    return {
      success: true,
      message: 'User attendance history retrieved successfully',
      attendances: attendancesWithDetails,
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getDetail = async (attendanceId) => {
  try {
    const attendance = await attendanceModel.getDetail(attendanceId)
    if (!attendance) {
      return {
        success: false,
        message: 'Attendance not found',
      }
    }

    const user = await userModel.getDetailById(attendance.userId)
    const location = await locationModel.getDetailById(attendance.locationId)

    return {
      success: true,
      message: 'Attendance details retrieved successfully',
      attendance: {
        ...sanitize(attendance),
        user: user
          ? {
              _id: user._id,
              fullName: user.fullName,
              phone: user.phone,
            }
          : null,
        location: location
          ? {
              _id: location._id,
              name: location.name,
              address: location.address,
            }
          : null,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (attendanceId, data) => {
  try {
    const existingAttendance = await attendanceModel.getDetailById(attendanceId)
    if (existingAttendance === null) {
      return {
        success: false,
        message: 'Attendance not found',
      }
    }

    const updateData = {
      ...data,
      updatedAt: Date.now(),
    }

    if (data.checkinTime && data.checkoutTime) {
      const checkinTime = new Date(data.checkinTime)
      const checkoutTime = new Date(data.checkoutTime)
      const hours = Math.round(((checkoutTime - checkinTime) / (1000 * 60 * 60)) * 100) / 100
      updateData.hours = hours
    }

    const result = await attendanceModel.updateInfo(attendanceId, updateData)

    return {
      success: true,
      message: 'Attendance updated successfully',
      attendance: {
        ...sanitize(result),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteAttendance = async (attendanceId) => {
  try {
    const existingAttendance = await attendanceModel.getDetailById(attendanceId)
    if (!existingAttendance) {
      return {
        success: false,
        message: 'Attendance not found',
      }
    }

    const result = await attendanceModel.deleteAttendance(attendanceId)
    return {
      success: true,
      message: 'Attendance deleted successfully',
      result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getLocationAttendances = async (locationId, startDate, endDate) => {
  try {
    const location = await locationModel.getDetailById(locationId)
    if (!location) {
      return {
        success: false,
        message: 'Location not found',
      }
    }

    const attendances = await attendanceModel.getAttendancesByLocation(locationId, startDate, endDate)

    const attendancesWithDetails = await Promise.all(
      attendances.map(async (attendance) => {
        const user = await userModel.getDetailById(attendance.userId)
        return {
          ...sanitize(attendance),
          user: user
            ? {
                _id: user._id,
                fullName: user.fullName,
                phone: user.phone,
              }
            : null,
        }
      })
    )

    return {
      success: true,
      message: 'Location attendances retrieved successfully',
      attendances: attendancesWithDetails,
      location: {
        _id: location._id,
        name: location.name,
        address: location.address,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Get paginated list of user attendances
const getListAttendanceByUserId = async (userId, options = {}) => {
  try {
    // Validate user existence
    const user = await userModel.getDetailById(userId)
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Get attendances with pagination
    const result = await attendanceModel.getListAttendanceByUserId(userId, options)

    // Add user and location details to each attendance
    const attendancesWithDetails = await Promise.all(
      result.data.map(async (attendance) => {
        const location = await locationModel.getDetailById(attendance.locationId)
        return {
          ...sanitize(attendance),
          location: location
            ? {
                _id: location._id,
                name: location.name,
                address: location.address,
              }
            : null,
        }
      })
    )

    return {
      success: true,
      message: 'User attendances retrieved successfully',
      attendances: attendancesWithDetails,
      pagination: result.pagination,
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const attendanceService = {
  toggleAttendance, // NEW: Unified checkin/checkout
  getActiveAttendance,
  getUserHistory,
  getDetail,
  updateInfo,
  deleteAttendance,
  getLocationAttendances,
  getListAttendanceByUserId, // NEW: Get paginated user attendances
}
