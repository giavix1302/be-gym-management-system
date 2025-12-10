// functions.service.js - AI Function Implementations for Gemini Function Calling

import { membershipModel } from '~/modules/membership/model/membership.model.js'
import { locationModel } from '~/modules/location/model/location.model.js'
import { classModel } from '~/modules/class/model/class.model.js'
import { trainerModel } from '~/modules/trainer/model/trainer.model.js'
import { equipmentModel } from '~/modules/equipment/model/equipment.model.js'
import { roomModel } from '~/modules/room/model/room.model.js'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model.js'
import { membershipModel as membershipModelOriginal } from '~/modules/membership/model/membership.model.js'
import { userModel } from '~/modules/user/model/user.model.js'
import { formatPrice } from '~/utils/utils.js'
import { SUBSCRIPTION_STATUS } from '~/utils/constants.js'

// =====================================
// GENERAL GYM DATA FUNCTIONS (Public)
// =====================================

/**
 * Get all membership packages
 */
const getMemberships = async () => {
  try {
    const memberships = await membershipModel.getListWithQuantityUser()

    if (!memberships || memberships.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Hiện chưa có gói membership nào',
      }
    }

    const formattedData = memberships.map((m) => ({
      id: m._id?.toString(),
      name: m.name,
      price: m.price,
      priceFormatted: formatPrice(m.price),
      discount: m.discount,
      durationMonths: m.durationMonth,
      description: m.description,
      features: m.features || [],
      type: m.type,
      currentUsers: m.totalUsers || 0,
      bannerURL: m.bannerURL,
    }))

    return {
      success: true,
      data: formattedData,
      count: formattedData.length,
    }
  } catch (error) {
    console.error('getMemberships error:', error)
    return {
      success: false,
      error: 'Không thể lấy danh sách gói membership',
      fallback: true,
    }
  }
}

/**
 * Get all gym locations
 */
const getLocations = async () => {
  try {
    const locations = await locationModel.getListLocation()

    if (!locations || locations.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Hiện chưa có cơ sở nào',
      }
    }

    const formattedData = locations.map((loc) => ({
      id: loc._id?.toString(),
      name: loc.name,
      address: {
        street: loc.address?.street,
        ward: loc.address?.ward,
        province: loc.address?.province,
        full: `${loc.address?.street}, ${loc.address?.ward}, ${loc.address?.province}`,
      },
      phone: loc.phone,
      images: loc.images || [],
    }))

    return {
      success: true,
      data: formattedData,
      count: formattedData.length,
    }
  } catch (error) {
    console.error('getLocations error:', error)
    return {
      success: false,
      error: 'Không thể lấy danh sách cơ sở gym',
      fallback: true,
    }
  }
}

/**
 * Get available classes with optional filters
 * @param {string} classType - Optional filter: yoga, boxing, dance, gym
 * @param {string} locationId - Optional location filter
 */
const getClasses = async (classType = null, locationId = null) => {
  try {
    let classes = await classModel.getListClassInfoForUser()

    if (!classes || classes.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Hiện chưa có lớp học nào',
      }
    }

    // Apply filters
    if (classType) {
      classes = classes.filter((c) => c.classType?.toLowerCase() === classType.toLowerCase())
    }

    if (locationId) {
      classes = classes.filter((c) => c.locationId?.toString() === locationId)
    }

    const formattedData = classes.map((c) => ({
      id: c._id?.toString(),
      name: c.name,
      type: c.classType,
      description: c.description,
      price: c.price,
      priceFormatted: formatPrice(c.price),
      ratePerSession: c.ratePerClassSession,
      capacity: c.capacity,
      enrolled: c.enrolled || 0,
      available: (c.capacity || 0) - (c.enrolled || 0),
      startDate: c.startDate,
      endDate: c.endDate,
      location: {
        id: c.locationId?.toString(),
        name: c.locationName,
        address: c.address,
      },
      trainers:
        c.trainers?.map((t) => ({
          id: t._id?.toString(),
          name: t.name,
          specialization: t.specialization,
          rating: t.rating,
        })) || [],
      schedule: c.recurrence || [],
      image: c.image,
    }))

    return {
      success: true,
      data: formattedData,
      count: formattedData.length,
      filters: { classType, locationId },
    }
  } catch (error) {
    console.error('getClasses error:', error)
    return {
      success: false,
      error: 'Không thể lấy danh sách lớp học',
      fallback: true,
    }
  }
}

/**
 * Get all trainers with optional specialization filter
 * @param {string} specialization - Optional filter: gym, boxing, yoga, dance
 */
const getTrainers = async (specialization = null) => {
  try {
    let trainers = await trainerModel.getListTrainerForUser()

    if (!trainers || trainers.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Hiện chưa có huấn luyện viên nào',
      }
    }

    // Apply filter
    if (specialization) {
      trainers = trainers.filter((t) => t.specialization?.toLowerCase() === specialization.toLowerCase())
    }

    const formattedData = trainers.map((t) => ({
      id: t._id?.toString(),
      name: t.name,
      specialization: t.specialization,
      experience: t.experience,
      education: t.education,
      rating: t.rating || 0,
      totalReviews: t.totalReviews || 0,
      pricePerSession: t.pricePerSession,
      priceFormatted: formatPrice(t.pricePerSession),
      bio: t.bio,
      certifications: t.certifications || [],
      avatar: t.avatar,
    }))

    return {
      success: true,
      data: formattedData,
      count: formattedData.length,
      filters: { specialization },
    }
  } catch (error) {
    console.error('getTrainers error:', error)
    return {
      success: false,
      error: 'Không thể lấy danh sách huấn luyện viên',
      fallback: true,
    }
  }
}

/**
 * Get gym equipment with optional filters
 * @param {string} muscleCategory - Optional muscle group filter
 * @param {string} locationId - Optional location filter
 */
const getEquipment = async (muscleCategory = null, locationId = null) => {
  try {
    let equipment = await equipmentModel.getAllEquipments()

    if (!equipment || equipment.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Hiện chưa có thiết bị nào',
      }
    }

    // Apply filters
    if (muscleCategory) {
      equipment = equipment.filter((e) => e.muscleCategory?.toLowerCase() === muscleCategory.toLowerCase())
    }

    if (locationId) {
      equipment = equipment.filter((e) => e.locationId?.toString() === locationId)
    }

    const formattedData = equipment.map((e) => ({
      id: e._id?.toString(),
      name: e.name,
      brand: e.brand,
      muscleCategory: e.muscleCategory,
      status: e.status,
      location: {
        id: e.locationId?.toString(),
        name: e.locationName,
      },
      images: e.images || [],
    }))

    return {
      success: true,
      data: formattedData,
      count: formattedData.length,
      filters: { muscleCategory, locationId },
    }
  } catch (error) {
    console.error('getEquipment error:', error)
    return {
      success: false,
      error: 'Không thể lấy danh sách thiết bị',
      fallback: true,
    }
  }
}

/**
 * Get rooms by location
 * @param {string} locationId - Required location ID
 */
const getRooms = async (locationId) => {
  try {
    if (!locationId) {
      return {
        success: false,
        error: 'LocationId is required',
      }
    }

    const rooms = await roomModel.getListRoomWithClassSessionsByLocationId(locationId)

    if (!rooms || rooms.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Cơ sở này chưa có phòng tập nào',
      }
    }

    const formattedData = rooms.map((r) => ({
      id: r._id?.toString(),
      name: r.name,
      capacity: r.capacity,
      location: {
        id: r.locationId?.toString(),
        name: r.locationName,
      },
      upcomingSessions:
        r.upcomingSessions?.map((s) => ({
          id: s._id?.toString(),
          className: s.className,
          startTime: s.startTime,
          endTime: s.endTime,
        })) || [],
    }))

    return {
      success: true,
      data: formattedData,
      count: formattedData.length,
    }
  } catch (error) {
    console.error('getRooms error:', error)
    return {
      success: false,
      error: 'Không thể lấy danh sách phòng tập',
      fallback: true,
    }
  }
}

/**
 * Get general gym information (static data)
 */
const getGymInfo = async () => {
  try {
    return {
      success: true,
      data: {
        name: 'THE GYM',
        operatingHours: {
          daily: '06:00 - 22:00',
          description: 'Mở cửa hàng ngày kể cả cuối tuần và ngày lễ',
        },
        contact: {
          hotline: '1900-1234',
          email: 'thegym@gmail.com',
          website: 'www.thegym.com',
        },
        policies: [
          'Thành viên phải xuất trình thẻ membership khi vào gym',
          'Yêu cầu trang phục tập luyện phù hợp',
          'Thiết bị phải được trả lại sau khi sử dụng',
          'Tập PT cần đặt lịch trước',
          'Lớp học có giới hạn số lượng, đăng ký sớm để có chỗ',
        ],
        facilities: ['Phòng tập gym hiện đại', 'Phòng yoga', 'Phòng boxing', 'Khu vực cardio', 'Phòng thay đồ và tắm'],
      },
    }
  } catch (error) {
    console.error('getGymInfo error:', error)
    return {
      success: false,
      error: 'Không thể lấy thông tin gym',
      fallback: true,
    }
  }
}

// =====================================
// PERSONAL FUNCTIONS (Require Auth)
// =====================================

/**
 * Get user's active membership subscription
 * @param {string} userId - User ID (required)
 */
const getMyMembership = async (userId) => {
  try {
    // Check authentication
    if (!userId) {
      return {
        success: false,
        requiresLogin: true,
        message: 'Cần đăng nhập để xem thông tin gói tập',
      }
    }

    // Get user info
    const user = await userModel.getDetailById(userId)
    if (!user) {
      return {
        success: false,
        error: 'Không tìm thấy thông tin người dùng',
      }
    }

    // Get active subscription
    const subscription = await subscriptionModel.getActiveSubscriptionByUserId(userId)

    if (!subscription) {
      return {
        success: true,
        hasSubscription: false,
        user: {
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
        },
        message: 'Chưa có gói membership nào đang hoạt động',
      }
    }

    // Get membership details
    const membership = await membershipModelOriginal.getDetailById(subscription.membershipId)

    // Calculate days left
    const now = new Date()
    const endDate = new Date(subscription.endDate)
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))

    return {
      success: true,
      hasSubscription: true,
      user: {
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
      },
      membership: {
        id: membership?._id?.toString(),
        name: membership?.name,
        price: membership?.price,
        priceFormatted: formatPrice(membership?.price),
        durationMonths: membership?.durationMonth,
        description: membership?.description,
        features: membership?.features || [],
      },
      subscription: {
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isActive: subscription.status === SUBSCRIPTION_STATUS.ACTIVE,
      },
      daysLeft: daysLeft,
      expiryWarning: daysLeft <= 7 ? 'Gói membership sắp hết hạn' : daysLeft <= 30 ? 'Nên gia hạn sớm để nhận ưu đãi' : null,
    }
  } catch (error) {
    console.error('getMyMembership error:', error)
    return {
      success: false,
      error: 'Không thể lấy thông tin gói membership',
      fallback: true,
    }
  }
}

/**
 * Get user's schedule for next 7 days
 * @param {string} userId - User ID (required)
 * @param {string} date - Optional specific date (YYYY-MM-DD)
 */
const getMySchedule = async (userId, date = null) => {
  try {
    // Check authentication
    if (!userId) {
      return {
        success: false,
        requiresLogin: true,
        message: 'Cần đăng nhập để xem lịch tập cá nhân',
      }
    }

    // Get user info
    const user = await userModel.getDetailById(userId)
    if (!user) {
      return {
        success: false,
        error: 'Không tìm thấy thông tin người dùng',
      }
    }

    // Check active subscription
    const subscription = await subscriptionModel.getActiveSubscriptionByUserId(userId)
    if (!subscription || subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
      return {
        success: true,
        hasActiveSubscription: false,
        message: 'Cần có gói membership đang hoạt động để xem lịch tập',
      }
    }

    // Get events for next 7 days
    const allEvents = await userModel.getUserEventsForThreeMonths(userId)

    // Filter to next 7 days
    const now = new Date()
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const filteredEvents = allEvents.filter((event) => {
      const eventDate = new Date(event.startTime)
      return eventDate >= now && eventDate <= next7Days
    })

    // Format events
    const formattedEvents = filteredEvents.map((event) => ({
      id: event._id?.toString(),
      type: event.eventType,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      trainerName: event.trainerName,
      locationName: event.locationName,
      roomName: event.roomName,
      className: event.className,
    }))

    // Group by date
    const groupedByDate = {}
    formattedEvents.forEach((event) => {
      const dateKey = new Date(event.startTime).toDateString()
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(event)
    })

    return {
      success: true,
      hasActiveSubscription: true,
      user: {
        fullName: user.fullName,
      },
      events: formattedEvents,
      groupedByDate: groupedByDate,
      totalCount: formattedEvents.length,
      summary: {
        totalSessions: formattedEvents.length,
        bookings: formattedEvents.filter((e) => e.type === 'booking').length,
        classes: formattedEvents.filter((e) => e.type === 'classSession').length,
      },
    }
  } catch (error) {
    console.error('getMySchedule error:', error)
    return {
      success: false,
      error: 'Không thể lấy lịch tập',
      fallback: true,
    }
  }
}

/**
 * Get classes user is enrolled in
 * @param {string} userId - User ID (required)
 */
const getMyEnrolledClasses = async (userId) => {
  try {
    // Check authentication
    if (!userId) {
      return {
        success: false,
        requiresLogin: true,
        message: 'Cần đăng nhập để xem lớp học đã đăng ký',
      }
    }

    // Get enrolled classes
    const enrolledClasses = await classModel.getMemberEnrolledClasses(userId)

    if (!enrolledClasses || enrolledClasses.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Chưa đăng ký lớp học nào',
      }
    }

    const formattedData = enrolledClasses.map((c) => ({
      id: c._id?.toString(),
      name: c.name,
      type: c.classType,
      description: c.description,
      startDate: c.startDate,
      endDate: c.endDate,
      schedule: c.recurrence || [],
      trainers:
        c.trainers?.map((t) => ({
          name: t.name,
          specialization: t.specialization,
        })) || [],
      location: c.locationName,
    }))

    return {
      success: true,
      data: formattedData,
      enrollmentCount: formattedData.length,
    }
  } catch (error) {
    console.error('getMyEnrolledClasses error:', error)
    return {
      success: false,
      error: 'Không thể lấy danh sách lớp đã đăng ký',
      fallback: true,
    }
  }
}

// =====================================
// FUNCTION EXECUTOR (Called by Gemini Service)
// =====================================

/**
 * Execute a function call from Gemini
 * @param {string} functionName - Name of the function to execute
 * @param {object} args - Function arguments
 * @param {string} userId - Current user ID (null if anonymous)
 */
export const executeFunctionCall = async (functionName, args = {}, userId = null) => {
  console.log(`🔧 Executing function: ${functionName}`, { args, userId: userId || 'anonymous' })

  try {
    let result

    switch (functionName) {
      // General functions
      case 'getMemberships':
        result = await getMemberships()
        break

      case 'getLocations':
        result = await getLocations()
        break

      case 'getClasses':
        result = await getClasses(args.classType, args.locationId)
        break

      case 'getTrainers':
        result = await getTrainers(args.specialization)
        break

      case 'getEquipment':
        result = await getEquipment(args.muscleCategory, args.locationId)
        break

      case 'getRooms':
        result = await getRooms(args.locationId)
        break

      case 'getGymInfo':
        result = await getGymInfo()
        break

      // Personal functions (require userId)
      case 'getMyMembership':
        result = await getMyMembership(userId || args.userId)
        break

      case 'getMySchedule':
        result = await getMySchedule(userId || args.userId, args.date)
        break

      case 'getMyEnrolledClasses':
        result = await getMyEnrolledClasses(userId || args.userId)
        break

      default:
        result = {
          success: false,
          error: `Function '${functionName}' not found`,
        }
    }

    console.log(`✅ Function ${functionName} completed:`, { success: result.success })
    return result
  } catch (error) {
    console.error(`❌ Function ${functionName} failed:`, error)
    return {
      success: false,
      error: `Lỗi khi thực thi function '${functionName}': ${error.message}`,
      fallback: true,
    }
  }
}

// Export individual functions for testing
export default {
  executeFunctionCall,
  getMemberships,
  getLocations,
  getClasses,
  getTrainers,
  getEquipment,
  getRooms,
  getGymInfo,
  getMyMembership,
  getMySchedule,
  getMyEnrolledClasses,
}
