// action/cancellation.service.js - Handle booking and enrollment cancellations

import { classEnrollmentModel } from '~/modules/classEnrollment/model/classEnrollment.model.js'
import { bookingModel } from '~/modules/booking/model/booking.model.js'
import { scheduleModel } from '~/modules/schedule/model/schedule.model.js'
import { trainerModel } from '~/modules/trainer/model/trainer.model.js'
import { classModel } from '~/modules/class/model/class.model.js'
import { GET_DB } from '~/config/mongodb.config.js'
import { ObjectId } from 'mongodb'
import { CLASS_ENROLLMENT_STATUS, BOOKING_STATUS } from '~/utils/constants.js'
import { formatPrice, formatDateVN, formatDateRange } from '~/utils/utils.js'

// Entity extraction for cancellation
const extractCancellationEntities = (entities) => {
  const originalText = entities.originalText?.toLowerCase() || ''
  const extracted = {
    bookingId: null,
    enrollmentId: null,
    confirmed: entities.confirmed || false,
    cancelType: null, // 'booking' or 'enrollment'
  }

  // Extract IDs from text patterns
  const idPatterns = [
    /(?:mã|id|số)\s*[:\-]?\s*([a-f0-9]{24})/i,
    /booking\s*[:\-]?\s*([a-f0-9]{24})/i,
    /enrollment\s*[:\-]?\s*([a-f0-9]{24})/i,
  ]

  for (const pattern of idPatterns) {
    const match = originalText.match(pattern)
    if (match) {
      extracted.bookingId = match[1]
      extracted.enrollmentId = match[1]
      break
    }
  }

  // Determine cancellation type from context
  if (originalText.includes('trainer') || originalText.includes('pt')) {
    extracted.cancelType = 'booking'
  } else if (originalText.includes('lớp') || originalText.includes('class')) {
    extracted.cancelType = 'enrollment'
  }

  return extracted
}

// Get user's cancellable items
const getUserCancellableItems = async (userId) => {
  try {
    const db = await GET_DB()

    // Get active bookings
    const bookings = await db
      .collection(bookingModel.BOOKING_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING] },
          },
        },
        {
          $lookup: {
            from: scheduleModel.SCHEDULE_COLLECTION_NAME,
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'schedule',
          },
        },
        {
          $unwind: '$schedule',
        },
        {
          $lookup: {
            from: 'users',
            let: { trainerId: '$schedule.trainerId' },
            pipeline: [
              {
                $lookup: {
                  from: trainerModel.TRAINER_COLLECTION_NAME,
                  localField: '_id',
                  foreignField: 'userId',
                  as: 'trainer',
                },
              },
              { $unwind: '$trainer' },
              { $match: { $expr: { $eq: ['$trainer._id', '$$trainerId'] } } },
            ],
            as: 'trainerUser',
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            price: 1,
            status: 1,
            startTime: '$schedule.startTime',
            endTime: '$schedule.endTime',
            trainerName: { $arrayElemAt: ['$trainerUser.fullName', 0] },
            type: { $literal: 'booking' },
          },
        },
      ])
      .toArray()

    // Get active enrollments
    const enrollments = await db
      .collection(classEnrollmentModel.CLASS_ENROLLMENT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            status: { $in: [CLASS_ENROLLMENT_STATUS.ENROLLED, CLASS_ENROLLMENT_STATUS.ACTIVE] },
          },
        },
        {
          $lookup: {
            from: classModel.CLASS_COLLECTION_NAME,
            localField: 'classId',
            foreignField: '_id',
            as: 'class',
          },
        },
        {
          $unwind: '$class',
        },
        {
          $lookup: {
            from: 'class_sessions',
            localField: 'classId',
            foreignField: 'classId',
            as: 'sessions',
          },
        },
        {
          $addFields: {
            futureSessions: {
              $filter: {
                input: '$sessions',
                cond: { $gt: ['$$this.startTime', new Date().toISOString()] },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            price: 1,
            status: 1,
            className: '$class.name',
            classType: '$class.classType',
            startDate: '$class.startDate',
            endDate: '$class.endDate',
            remainingSessions: { $size: '$futureSessions' },
            nextSessionTime: { $min: '$futureSessions.startTime' },
            type: { $literal: 'enrollment' },
          },
        },
      ])
      .toArray()

    return { bookings, enrollments }
  } catch (error) {
    console.error('Get user cancellable items error:', error)
    return { bookings: [], enrollments: [] }
  }
}

// Show cancellation options
const showCancellationOptions = async (userId) => {
  try {
    const { bookings, enrollments } = await getUserCancellableItems(userId)

    if (bookings.length === 0 && enrollments.length === 0) {
      return {
        content: `Bạn không có lịch hẹn nào để hủy.\n\nĐể xem lịch trình hiện tại, nhập "Xem lịch của tôi"`,
        type: 'no_cancellable_items',
        action: 'cancel_booking',
      }
    }

    let content = `📋 CÁC LỊCH HẸN CÓ THỂ HỦY:\n\n`

    // Show trainer bookings
    if (bookings.length > 0) {
      content += `💪 LỊCH TRAINER:\n`
      bookings.forEach((booking, index) => {
        content += `${index + 1}. ${booking.title}\n`
        content += `   ID: ${booking._id}\n`
        content += `   👨‍🏫 Trainer: ${booking.trainerName}\n`
        content += `   📅 ${formatDateVN(booking.startTime)}\n`
        content += `   💰 ${formatPrice(booking.price)}\n\n`
      })
    }

    // Show class enrollments
    if (enrollments.length > 0) {
      content += `📚 LỚP HỌC:\n`
      enrollments.forEach((enrollment, index) => {
        const displayIndex = index + bookings.length + 1
        content += `${displayIndex}. ${enrollment.className}\n`
        content += `   ID: ${enrollment._id}\n`
        content += `   📅 ${formatDateRange(enrollment.startDate, enrollment.endDate)}\n`
        content += `   🏃 Buổi còn lại: ${enrollment.remainingSessions}\n`
        content += `   💰 ${formatPrice(enrollment.price)}\n\n`
      })
    }

    content += `Để hủy, nhập: "Hủy [ID]"\nVí dụ: "Hủy 60a7c8b5f123456789abcdef"`

    return {
      content,
      type: 'cancellation_options',
      action: 'cancel_booking',
      data: { bookings, enrollments },
    }
  } catch (error) {
    console.error('Show cancellation options error:', error)
    return {
      content: 'Không thể tải danh sách lịch hẹn. Vui lòng thử lại sau!',
      type: 'error',
      action: 'cancel_booking',
    }
  }
}

// Process specific cancellation
const processCancellation = async (entities, userId) => {
  const { bookingId, enrollmentId, cancelType } = extractCancellationEntities(entities)

  if (!bookingId && !enrollmentId) {
    return {
      content: `Không tìm thấy mã lịch hẹn để hủy.\n\nVui lòng nhập: "Hủy [ID]" hoặc "Hủy lịch" để xem danh sách.`,
      type: 'missing_id',
      action: 'cancel_booking',
    }
  }

  // Try to find and cancel booking first
  if (bookingId || cancelType === 'booking') {
    const bookingResult = await processPTCancellation(bookingId || enrollmentId, userId)
    if (bookingResult.type !== 'booking_not_found') {
      return bookingResult
    }
  }

  // Try to find and cancel enrollment
  if (enrollmentId || cancelType === 'enrollment') {
    const enrollmentResult = await processClassCancellation(enrollmentId || bookingId, userId)
    if (enrollmentResult.type !== 'enrollment_not_found') {
      return enrollmentResult
    }
  }

  return {
    content: `Không tìm thấy lịch hẹn với ID này.\n\nVui lòng kiểm tra lại ID hoặc nhập "Hủy lịch" để xem danh sách.`,
    type: 'not_found',
    action: 'cancel_booking',
  }
}

// Process PT booking cancellation
const processPTCancellation = async (bookingId, userId) => {
  try {
    // Get booking details
    const booking = await getBookingDetails(bookingId, userId)

    if (!booking) {
      return {
        content: `Không tìm thấy booking để hủy.`,
        type: 'booking_not_found',
        action: 'cancel_booking',
      }
    }

    // Check if can cancel (2 hours before session)
    const sessionTime = new Date(booking.startTime)
    const now = new Date()
    const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60)

    if (hoursUntilSession < 2) {
      return {
        content: `❌ KHÔNG THỂ HỦY LỊCH TRAINER!\n\nLý do: Chỉ có thể hủy trước 2 giờ\nBuổi tập: ${Math.round(
          hoursUntilSession * 60
        )} phút nữa\n\nVui lòng liên hệ trainer hoặc staff để được hỗ trợ!`,
        type: 'cancellation_too_late',
        action: 'cancel_booking',
        booking: booking,
      }
    }

    // Update booking status to cancelled
    await updateBookingStatus(bookingId, BOOKING_STATUS.CANCELLED)

    return {
      content: `✅ HỦY LỊCH TRAINER THÀNH CÔNG!\n\n💪 Đã hủy: ${booking.title}\n👨‍🏫 Trainer: ${
        booking.trainerName
      }\n📅 Thời gian: ${formatDateVN(booking.startTime)} - ${formatDateVN(booking.endTime)}\n💰 Số tiền: ${formatPrice(
        booking.price
      )}\n\n📋 CHÍNH SÁCH HỦY:\n• Không hoàn tiền khi hủy\n• Không áp dụng phí hủy\n• Slot sẽ được mở lại cho khách khác\n\nCảm ơn bạn đã sử dụng dịch vụ!`,
      type: 'cancellation_success',
      action: 'cancel_booking',
      cancelledBooking: booking,
    }
  } catch (error) {
    console.error('Process PT cancellation error:', error)
    return {
      content: 'Đã xảy ra lỗi khi hủy lịch trainer. Vui lòng thử lại sau!',
      type: 'error',
      action: 'cancel_booking',
    }
  }
}

// Process class enrollment cancellation
const processClassCancellation = async (enrollmentId, userId) => {
  try {
    // Get enrollment details
    const enrollment = await getEnrollmentDetails(enrollmentId, userId)

    if (!enrollment) {
      return {
        content: `Không tìm thấy đăng ký lớp để hủy.`,
        type: 'enrollment_not_found',
        action: 'cancel_booking',
      }
    }

    // Check if can cancel (1 hour before first session)
    const nextSessionTime = new Date(enrollment.nextSessionTime)
    const now = new Date()
    const hoursUntilSession = (nextSessionTime - now) / (1000 * 60 * 60)

    if (hoursUntilSession < 1) {
      return {
        content: `❌ KHÔNG THỂ HỦY ĐĂNG KÝ!\n\nLý do: Chỉ có thể hủy trước 1 giờ\nBuổi học tiếp theo: ${Math.round(
          hoursUntilSession * 60
        )} phút nữa\n\nVui lòng liên hệ staff để được hỗ trợ!`,
        type: 'cancellation_too_late',
        action: 'cancel_booking',
        enrollment: enrollment,
      }
    }

    // Update enrollment status to cancelled
    await updateEnrollmentStatus(enrollmentId, CLASS_ENROLLMENT_STATUS.CANCELLED)

    // Remove user from remaining class sessions
    await removeUserFromClassSessions(userId, enrollment.classId)

    return {
      content: `✅ HỦY ĐĂNG KÝ THÀNH CÔNG!\n\n📚 Đã hủy: ${enrollment.className} (${
        enrollment.classType
      })\n📅 Thời gian: ${formatDateRange(enrollment.startDate, enrollment.endDate)}\n🏃 Buổi còn lại: ${
        enrollment.remainingSessions
      }\n💰 Số tiền: ${formatPrice(
        enrollment.price
      )}\n\n📋 CHÍNH SÁCH HỦY:\n• Không hoàn tiền khi hủy đăng ký\n• Không áp dụng phí hủy\n• Chỗ sẽ được mở lại cho học viên khác\n\nCảm ơn bạn đã sử dụng dịch vụ!`,
      type: 'cancellation_success',
      action: 'cancel_booking',
      cancelledEnrollment: enrollment,
    }
  } catch (error) {
    console.error('Process class cancellation error:', error)
    return {
      content: 'Đã xảy ra lỗi khi hủy đăng ký lớp. Vui lòng thử lại sau!',
      type: 'error',
      action: 'cancel_booking',
    }
  }
}

// Database operation helpers
const getBookingDetails = async (bookingId, userId) => {
  try {
    const db = await GET_DB()

    const booking = await db
      .collection(bookingModel.BOOKING_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            _id: new ObjectId(String(bookingId)),
            userId: new ObjectId(String(userId)),
          },
        },
        {
          $lookup: {
            from: scheduleModel.SCHEDULE_COLLECTION_NAME,
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'schedule',
          },
        },
        {
          $unwind: '$schedule',
        },
        {
          $lookup: {
            from: 'users',
            let: { trainerId: '$schedule.trainerId' },
            pipeline: [
              {
                $lookup: {
                  from: trainerModel.TRAINER_COLLECTION_NAME,
                  localField: '_id',
                  foreignField: 'userId',
                  as: 'trainer',
                },
              },
              { $unwind: '$trainer' },
              { $match: { $expr: { $eq: ['$trainer._id', '$$trainerId'] } } },
            ],
            as: 'trainerUser',
          },
        },
        {
          $project: {
            title: 1,
            price: 1,
            startTime: '$schedule.startTime',
            endTime: '$schedule.endTime',
            trainerName: { $arrayElemAt: ['$trainerUser.fullName', 0] },
          },
        },
      ])
      .toArray()

    return booking[0] || null
  } catch (error) {
    console.error('Get booking details error:', error)
    return null
  }
}

const getEnrollmentDetails = async (enrollmentId, userId) => {
  try {
    const db = await GET_DB()

    const enrollment = await db
      .collection(classEnrollmentModel.CLASS_ENROLLMENT_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            _id: new ObjectId(String(enrollmentId)),
            userId: new ObjectId(String(userId)),
          },
        },
        {
          $lookup: {
            from: classModel.CLASS_COLLECTION_NAME,
            localField: 'classId',
            foreignField: '_id',
            as: 'class',
          },
        },
        {
          $unwind: '$class',
        },
        {
          $lookup: {
            from: 'class_sessions',
            localField: 'classId',
            foreignField: 'classId',
            as: 'sessions',
          },
        },
        {
          $addFields: {
            futureSessions: {
              $filter: {
                input: '$sessions',
                cond: { $gt: ['$$this.startTime', new Date().toISOString()] },
              },
            },
          },
        },
        {
          $project: {
            price: 1,
            className: '$class.name',
            classType: '$class.classType',
            classId: '$class._id',
            startDate: '$class.startDate',
            endDate: '$class.endDate',
            remainingSessions: { $size: '$futureSessions' },
            nextSessionTime: { $min: '$futureSessions.startTime' },
          },
        },
      ])
      .toArray()

    return enrollment[0] || null
  } catch (error) {
    console.error('Get enrollment details error:', error)
    return null
  }
}

const updateBookingStatus = async (bookingId, status) => {
  try {
    const db = await GET_DB()

    await db
      .collection(bookingModel.BOOKING_COLLECTION_NAME)
      .updateOne({ _id: new ObjectId(String(bookingId)) }, { $set: { status, updatedAt: new Date() } })

    return true
  } catch (error) {
    console.error('Update booking status error:', error)
    return false
  }
}

const updateEnrollmentStatus = async (enrollmentId, status) => {
  try {
    const db = await GET_DB()

    await db
      .collection(classEnrollmentModel.CLASS_ENROLLMENT_COLLECTION_NAME)
      .updateOne({ _id: new ObjectId(String(enrollmentId)) }, { $set: { status, updatedAt: new Date() } })

    return true
  } catch (error) {
    console.error('Update enrollment status error:', error)
    return false
  }
}

const removeUserFromClassSessions = async (userId, classId) => {
  try {
    const db = await GET_DB()

    // Remove user from all future class sessions
    await db.collection('class_sessions').updateMany(
      {
        classId: new ObjectId(String(classId)),
        startTime: { $gt: new Date().toISOString() },
      },
      {
        $pull: {
          participants: new ObjectId(String(userId)),
        },
      }
    )

    return true
  } catch (error) {
    console.error('Remove user from class sessions error:', error)
    return false
  }
}

// Main cancellation handler
export const handleCancelBooking = async (entities, userId) => {
  try {
    const cancellationEntities = extractCancellationEntities(entities)

    // If no specific ID provided, show cancellation options
    if (!cancellationEntities.bookingId && !cancellationEntities.enrollmentId) {
      return await showCancellationOptions(userId)
    }

    // Process specific cancellation
    return await processCancellation(entities, userId)
  } catch (error) {
    console.error('Cancel booking error:', error)
    return {
      content: 'Đã xảy ra lỗi khi hủy lịch hẹn. Vui lòng thử lại sau!',
      type: 'error',
      action: 'cancel_booking',
    }
  }
}

export const cancellationService = {
  handleCancelBooking,
  getUserCancellableItems,
  processPTCancellation,
  processClassCancellation,
}
