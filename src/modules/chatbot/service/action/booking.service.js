// action/booking.service.js - Handle booking-related actions

import { classModel } from '~/modules/class/model/class.model.js'
import { classEnrollmentModel } from '~/modules/classEnrollment/model/classEnrollment.model.js'
import { scheduleModel } from '~/modules/schedule/model/schedule.model.js'
import { bookingModel } from '~/modules/booking/model/booking.model.js'
import { trainerModel } from '~/modules/trainer/model/trainer.model.js'
import { userModel } from '~/modules/user/model/user.model.js'
import { GET_DB } from '~/config/mongodb.config.js'
import { ObjectId } from 'mongodb'
import { CLASS_ENROLLMENT_STATUS, BOOKING_STATUS, SUBSCRIPTION_STATUS } from '~/utils/constants.js'
import { formatPrice, formatDateVN, formatDateRange, getTimeRangeText } from '~/utils/utils.js'

// Entity extraction helpers
const extractBookingEntities = (entities) => {
  const originalText = entities.originalText?.toLowerCase() || ''
  const extracted = {
    classType: null,
    trainerName: null,
    date: null,
    time: null,
    confirmed: entities.confirmed || false,
    bookingId: null,
    enrollmentId: null,
  }

  // Extract class types
  if (originalText.includes('yoga')) extracted.classType = 'YOGA'
  if (originalText.includes('boxing') || originalText.includes('đấm bốc')) extracted.classType = 'BOXING'
  if (originalText.includes('dance') || originalText.includes('nhảy')) extracted.classType = 'DANCE'
  if (originalText.includes('cardio') || originalText.includes('tim mạch')) extracted.classType = 'CARDIO'

  // Extract booking/enrollment IDs from text patterns
  const idMatch = originalText.match(/(?:mã|id|số)\s*[:\-]?\s*([a-f0-9]{24})/i)
  if (idMatch) {
    extracted.bookingId = idMatch[1]
    extracted.enrollmentId = idMatch[1]
  }

  return extracted
}

// Class registration handlers
export const handleRegisterClass = async (entities, userId) => {
  try {
    const bookingEntities = extractBookingEntities(entities)

    // Step 1: Check if user has active membership
    const hasActiveMembership = await checkUserMembershipStatus(userId)
    if (!hasActiveMembership) {
      return {
        content: `❌ CẦN GÓI MEMBERSHIP!\n\nĐể đăng ký lớp học, bạn cần có gói membership đang hoạt động.\n\nVui lòng đăng ký gói membership trước, sau đó quay lại đăng ký lớp!`,
        type: 'membership_required',
        action: 'register_class',
      }
    }

    // Step 2: If no specific class type, show available classes
    if (!bookingEntities.classType) {
      return await showAvailableClasses()
    }

    // Step 3: Show classes of specific type for selection
    const availableClasses = await getClassesByType(bookingEntities.classType)
    if (!availableClasses || availableClasses.length === 0) {
      return {
        content: `Hiện tại không có lớp ${bookingEntities.classType} nào khả dụng.\n\nVui lòng chọn loại lớp khác hoặc liên hệ staff!`,
        type: 'no_classes_available',
        action: 'register_class',
      }
    }

    return await showClassSelection(availableClasses, bookingEntities.classType)
  } catch (error) {
    console.error('Register class error:', error)
    return {
      content: 'Không thể đăng ký lớp học. Vui lòng thử lại sau!',
      type: 'error',
      action: 'register_class',
    }
  }
}

const checkUserMembershipStatus = async (userId) => {
  try {
    const subscription = await GET_DB()
      .collection('subscriptions')
      .findOne({
        userId: new ObjectId(userId),
        status: SUBSCRIPTION_STATUS.ACTIVE,
        endDate: { $gt: new Date() },
      })

    return !!subscription
  } catch (error) {
    console.error('Check membership status error:', error)
    return false
  }
}

const showAvailableClasses = async () => {
  try {
    const classTypes = await classModel.getActiveClassTypes()

    if (!classTypes || classTypes.length === 0) {
      return {
        content: 'Hiện tại không có lớp học nào khả dụng. Vui lòng liên hệ staff!',
        type: 'no_classes',
        action: 'register_class',
      }
    }

    let content = '🏃 CÁC LOẠI LỚP HỌC:\n\n'

    classTypes.forEach((type, index) => {
      content += `${index + 1}. ${type.displayName || type._id}\n`
      content += `   📊 Số lớp: ${type.count}\n`
      if (type.priceRange) {
        content += `   💰 Giá: ${formatPrice(type.priceRange.min)} - ${formatPrice(type.priceRange.max)}\n`
      }
      content += '\n'
    })

    content += 'Vui lòng nhập loại lớp bạn muốn đăng ký (VD: "Yoga")'

    return {
      content,
      type: 'class_types',
      action: 'register_class',
      data: { classTypes },
    }
  } catch (error) {
    console.error('Show available classes error:', error)
    return {
      content: 'Không thể tải danh sách lớp học. Vui lòng thử lại!',
      type: 'error',
      action: 'register_class',
    }
  }
}

const getClassesByType = async (classType) => {
  try {
    return await classModel.getUpcomingClassesByType(classType)
  } catch (error) {
    console.error('Get classes by type error:', error)
    return []
  }
}

const showClassSelection = async (classes, classType) => {
  try {
    let content = `📚 LỚP ${classType.toUpperCase()} KHẢ DỤNG:\n\n`

    classes.forEach((cls, index) => {
      content += `${index + 1}. ${cls.name}\n`
      content += `   👨‍🏫 Trainer: ${cls.trainerName || 'TBA'}\n`
      content += `   📅 Thời gian: ${formatDateRange(cls.startDate, cls.endDate)}\n`
      content += `   🕐 Lịch: ${getTimeRangeText(cls.schedule)}\n`
      content += `   💰 Giá: ${formatPrice(cls.price)}\n`
      content += `   👥 Còn: ${cls.maxCapacity - cls.currentEnrollments}/${cls.maxCapacity} chỗ\n`
      content += `   📝 Mô tả: ${cls.description?.substring(0, 50) || 'N/A'}...\n\n`
    })

    content += `Nhập số thứ tự lớp bạn muốn đăng ký (1-${classes.length})`

    return {
      content,
      type: 'class_selection',
      action: 'register_class',
      data: { classes, classType },
    }
  } catch (error) {
    console.error('Show class selection error:', error)
    return {
      content: 'Không thể hiển thị danh sách lớp. Vui lòng thử lại!',
      type: 'error',
      action: 'register_class',
    }
  }
}

// Trainer booking handlers
export const handleBookTrainer = async (entities, userId) => {
  try {
    const bookingEntities = extractBookingEntities(entities)

    // Step 1: Check membership
    const hasActiveMembership = await checkUserMembershipStatus(userId)
    if (!hasActiveMembership) {
      return {
        content: `❌ CẦN GÓI MEMBERSHIP!\n\nĐể đặt lịch với trainer, bạn cần có gói membership đang hoạt động.\n\nVui lòng đăng ký gói membership trước!`,
        type: 'membership_required',
        action: 'book_trainer',
      }
    }

    // Step 2: Show available trainers if no specific selection
    if (!bookingEntities.trainerName && !bookingEntities.date) {
      return await showAvailableTrainers()
    }

    // Step 3: Handle trainer selection or date/time booking
    return await processTrainerBooking(bookingEntities, userId)
  } catch (error) {
    console.error('Book trainer error:', error)
    return {
      content: 'Không thể đặt lịch trainer. Vui lòng thử lại sau!',
      type: 'error',
      action: 'book_trainer',
    }
  }
}

const showAvailableTrainers = async () => {
  try {
    const trainers = await trainerModel.getAvailableTrainers()

    if (!trainers || trainers.length === 0) {
      return {
        content: 'Hiện tại không có trainer nào rảnh. Vui lòng thử lại sau hoặc liên hệ staff!',
        type: 'no_trainers',
        action: 'book_trainer',
      }
    }

    let content = '💪 TRAINERS KHẢ DỤNG:\n\n'

    trainers.forEach((trainer, index) => {
      content += `${index + 1}. ${trainer.fullName}\n`
      content += `   🏆 Chuyên môn: ${trainer.specialties?.join(', ') || 'General'}\n`
      content += `   ⭐ Đánh giá: ${trainer.rating || 'N/A'}/5\n`
      content += `   💰 Giá: ${formatPrice(trainer.hourlyRate)}/giờ\n`
      content += `   📅 Lịch rảnh: ${getTrainerAvailability(trainer.availability)}\n\n`
    })

    content += 'Nhập tên trainer hoặc số thứ tự để đặt lịch!'

    return {
      content,
      type: 'trainer_list',
      action: 'book_trainer',
      data: { trainers },
    }
  } catch (error) {
    console.error('Show available trainers error:', error)
    return {
      content: 'Không thể tải danh sách trainer. Vui lòng thử lại!',
      type: 'error',
      action: 'book_trainer',
    }
  }
}

const getTrainerAvailability = (availability) => {
  if (!availability || availability.length === 0) return 'Liên hệ để biết lịch'

  return availability
    .slice(0, 2)
    .map((slot) => `${slot.day} ${slot.timeRange}`)
    .join(', ')
}

const processTrainerBooking = async (entities, userId) => {
  // This would handle the booking flow
  // For now, return a placeholder
  return {
    content: 'Tính năng đặt lịch trainer đang được phát triển. Vui lòng liên hệ staff để được hỗ trợ!',
    type: 'coming_soon',
    action: 'book_trainer',
  }
}

// Schedule checking
export const handleCheckSchedule = async (entities, userId) => {
  try {
    const userSchedule = await getUserSchedule(userId)

    if (!userSchedule.bookings.length && !userSchedule.enrollments.length) {
      return {
        content: `📅 LỊCH TRÌNH CỦA BẠN:\n\nHiện tại bạn chưa có lịch hẹn nào.\n\n💡 BẠN CÓ THỂ:\n• Đặt lịch với trainer\n• Đăng ký lớp học\n• Xem lịch gym mở cửa\n\nNhập "Đặt lịch" để bắt đầu!`,
        type: 'empty_schedule',
        action: 'check_schedule',
      }
    }

    let content = '📅 LỊCH TRÌNH CỦA BẠN:\n\n'

    // Show trainer bookings
    if (userSchedule.bookings.length > 0) {
      content += '💪 LỊCH TRAINER:\n'
      userSchedule.bookings.forEach((booking, index) => {
        content += `${index + 1}. ${booking.title}\n`
        content += `   👨‍🏫 Trainer: ${booking.trainerName}\n`
        content += `   📅 ${formatDateVN(booking.startTime)} - ${formatDateVN(booking.endTime)}\n`
        content += `   💰 ${formatPrice(booking.price)}\n`
        content += `   📍 Trạng thái: ${getStatusLabel(booking.status)}\n\n`
      })
    }

    // Show class enrollments
    if (userSchedule.enrollments.length > 0) {
      content += '📚 LỚP HỌC:\n'
      userSchedule.enrollments.forEach((enrollment, index) => {
        content += `${index + 1}. ${enrollment.className}\n`
        content += `   📅 ${formatDateRange(enrollment.startDate, enrollment.endDate)}\n`
        content += `   💰 ${formatPrice(enrollment.price)}\n`
        content += `   📍 Trạng thái: ${getStatusLabel(enrollment.status)}\n\n`
      })
    }

    content += '💡 Để hủy lịch, nhập "Hủy lịch [mã booking]"'

    return {
      content,
      type: 'schedule_info',
      action: 'check_schedule',
      data: userSchedule,
    }
  } catch (error) {
    console.error('Check schedule error:', error)
    return {
      content: 'Không thể kiểm tra lịch trình. Vui lòng thử lại sau!',
      type: 'error',
      action: 'check_schedule',
    }
  }
}

const getUserSchedule = async (userId) => {
  try {
    const db = await GET_DB()

    // Get trainer bookings
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
            title: 1,
            price: 1,
            status: 1,
            startTime: '$schedule.startTime',
            endTime: '$schedule.endTime',
            trainerName: { $arrayElemAt: ['$trainerUser.fullName', 0] },
          },
        },
        {
          $sort: { startTime: 1 },
        },
      ])
      .toArray()

    // Get class enrollments
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
          $project: {
            price: 1,
            status: 1,
            className: '$class.name',
            startDate: '$class.startDate',
            endDate: '$class.endDate',
          },
        },
        {
          $sort: { startDate: 1 },
        },
      ])
      .toArray()

    return { bookings, enrollments }
  } catch (error) {
    console.error('Get user schedule error:', error)
    return { bookings: [], enrollments: [] }
  }
}

const getStatusLabel = (status) => {
  const labels = {
    PENDING: '⏳ Chờ xác nhận',
    CONFIRMED: '✅ Đã xác nhận',
    ENROLLED: '📚 Đã đăng ký',
    ACTIVE: '🔥 Đang học',
    CANCELLED: '❌ Đã hủy',
    COMPLETED: '✅ Hoàn thành',
  }
  return labels[status] || status
}

export const bookingService = {
  handleRegisterClass,
  handleBookTrainer,
  handleCheckSchedule,
  checkUserMembershipStatus,
  getUserSchedule,
}
