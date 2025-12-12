import { membershipModel } from '~/modules/membership/model/membership.model'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model'
import {
  BOOKING_STATUS,
  CLASS_ENROLLMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  STATUS_TYPE,
  SUBSCRIPTION_STATUS,
} from '~/utils/constants'
import { createPaymentURL, vnpay } from '~/utils/vnpay'
import { paymentModel } from '../model/payment.model'
import {
  calculateDiscountedPrice,
  calculateEndDate,
  convertVnpayDateToISO,
  countRemainingDays,
  createRedirectUrl,
  idFromTimestamp,
} from '~/utils/utils'
import { env } from '~/config/environment.config'
import { deleteLinkPaymentTemp, getLinkPaymentTemp, saveLinkPaymentTemp, savePaymentWithExpiry } from '~/utils/redis'
import { bookingModel } from '~/modules/booking/model/booking.model'
import { bookingService } from '~/modules/booking/service/booking.service'
import { classEnrollmentModel } from '~/modules/classEnrollment/model/classEnrollment.model'
import { classEnrollmentService } from '~/modules/classEnrollment/service/classEnrollment.service'
import { classSessionModel } from '~/modules/classSession/model/classSession.model'
import { userModel } from '~/modules/user/model/user.model'
import { paymentStatisticsModel } from '../model/paymentStatistics.model'

const createPaymentVnpay = async (body) => {
  try {
    const { membershipId, userId } = body

    // price, SubId, mess
    const membershipInfo = await membershipModel.getDetailById(membershipId.toString())
    const { price, name, discount } = membershipInfo

    const id = idFromTimestamp()

    // create payment url: subId, price, name
    const paymentUrl = createPaymentURL(id, calculateDiscountedPrice(price, discount).finalPrice, name)

    const expireAt = new Date(Date.now() + 10 * 60 * 1000)
    await saveLinkPaymentTemp(id, {
      membershipId,
      userId,
      paymentUrl,
      paymentType: PAYMENT_TYPE.MEMBERSHIP,
      expireAt: expireAt.toISOString(),
    })

    return {
      success: true,
      paymentUrl,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const createPaymentBookingPtVnpay = async (data) => {
  try {
    let dataArr = Array.isArray(data) ? data : []
    console.log('🚀 ~ createPaymentBookingPtVnpay ~ dataArr:', dataArr)
    if (dataArr.length === 0) return { success: false, message: 'Data is not correct' }

    let idBookingArr = []
    let titlePayment = ''

    const totalPrice = dataArr.reduce((sum, item) => sum + item.price, 0)

    // Tạo các booking
    for (const dataBooking of dataArr) {
      const result = await bookingService.createBooking(dataBooking)
      if (!result.success) {
        // Nếu có lỗi, rollback các booking đã tạo
        if (idBookingArr.length > 0) {
          console.log('❌ Error creating booking, rolling back created bookings:', idBookingArr)
          await bookingModel.deleteMultiplePendingBookings(idBookingArr)
        }
        return {
          ...result,
        }
      }
      idBookingArr.push(result.bookingId)
    }

    // Tạo title cho payment
    if (dataArr.length === 1) {
      titlePayment = dataArr[0].title
    } else {
      titlePayment = dataArr.length + ' buổi huấn luyện 1 kèm 1'
    }

    const id = idFromTimestamp()
    const paymentUrl = createPaymentURL(id, totalPrice, titlePayment)

    console.log('🚀 ~ createPaymentBookingPtVnpay ~ totalPrice:', totalPrice)
    console.log('🚀 ~ createPaymentBookingPtVnpay ~ idBookingArr:', idBookingArr)

    // SỬA: Dùng saveLinkPaymentTemp() như cũ (đã có backup mechanism)
    const expireAt = new Date(Date.now() + 10 * 60 * 1000)
    await saveLinkPaymentTemp(id, {
      idBookingArr,
      paymentUrl,
      paymentType: PAYMENT_TYPE.BOOKING,
      expireAt: expireAt.toISOString(),
      totalPrice,
      titlePayment,
      createdAt: new Date().toISOString(),
    })

    console.log(`💳 Payment created: ${id} with ${idBookingArr.length} bookings, expires in 30 minutes`)

    return {
      success: true,
      paymentUrl,
      paymentId: id,
      bookingIds: idBookingArr,
      expiresAt: expireAt.toISOString(),
    }
  } catch (error) {
    console.error('❌ Error in createPaymentBookingPtVnpay:', error)
    throw new Error(error)
  }
}

const createPaymentClassVnpay = async (data) => {
  try {
    const { userId, classId, title, price } = data
    // check duplicate time
    const conflict = await classEnrollmentModel.checkScheduleConflict(userId, classId)

    if (conflict) {
      return {
        success: false,
        message:
          `Cannot enroll: ${conflict.message}. ` +
          `Class session at ${conflict.classSession.startTime} conflicts with ` +
          `existing booking at ${conflict.existingBooking.startTime}`,
      }
    }

    const id = idFromTimestamp()
    // cần 1 title và price
    const paymentUrl = createPaymentURL(id, price, title)

    // tạo 1 mảng lưu id trong redis
    const expireAt = new Date(Date.now() + 10 * 60 * 1000)
    await saveLinkPaymentTemp(id, {
      userId,
      classId,
      paymentUrl,
      paymentType: PAYMENT_TYPE.CLASS,
      expireAt: expireAt.toISOString(),
    })

    return {
      success: true,
      paymentUrl,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const vnpReturn = async (query) => {
  try {
    const verify = vnpay.verifyReturnUrl(query) // verify chữ ký
    console.log('🚀 ~ vnpReturn ~ verify:', verify)
    const { vnp_TransactionStatus, vnp_TxnRef, vnp_Amount, vnp_OrderInfo, vnp_PayDate } = verify

    const dataToSaveRedis = await getLinkPaymentTemp(vnp_TxnRef)
    console.log('🚀 ~ vnpReturn ~ dataToSaveRedis:', dataToSaveRedis)

    if (dataToSaveRedis.paymentType === null) {
      return {
        success: false,
        url: `${env.FE_URL}/user/payment/failed`,
      }
    }

    if (dataToSaveRedis.paymentType === PAYMENT_TYPE.MEMBERSHIP) {
      const { membershipId, userId } = dataToSaveRedis
      if (vnp_TransactionStatus === '02') {
        await deleteLinkPaymentTemp(vnp_TxnRef)

        return {
          success: false,
          url: `${env.FE_URL}/user/payment/failed`,
        }
      }

      // get membershipId, userId
      // const subscriptionInfo = await subscriptionModel.getDetailById(subId)
      // const { userId, membershipId } = subscriptionInfo
      // create subscription
      const membershipInfo = await membershipModel.getDetailById(membershipId)
      const { durationMonth } = membershipInfo

      const userInfo = await userModel.getDetailById(userId)

      const dataToCreateSubscription = {
        userId,
        membershipId,
        startDate: convertVnpayDateToISO(vnp_PayDate),
        endDate: calculateEndDate(convertVnpayDateToISO(vnp_PayDate), durationMonth),
        status: SUBSCRIPTION_STATUS.ACTIVE,
        paymentStatus: PAYMENT_STATUS.PAID,
        remainingSessions: countRemainingDays(calculateEndDate(convertVnpayDateToISO(vnp_PayDate), durationMonth)),
      }

      const subInfo = await subscriptionModel.createNew(dataToCreateSubscription)

      // create payment: userId, price, refId, paymentType, method, description
      const dataToSave = {
        userId: userId.toString(),
        referenceId: subInfo.insertedId.toString(),
        paymentType: PAYMENT_TYPE.MEMBERSHIP,
        amount: vnp_Amount,
        paymentDate: convertVnpayDateToISO(vnp_PayDate),
        paymentMethod: PAYMENT_METHOD.VNPAY,
        description: vnp_OrderInfo,
      }
      console.log('🚀 ~ vnpReturn ~ dataToSave:', dataToSave)
      await paymentModel.createNew(dataToSave)

      const updateStatusUser = {
        status: STATUS_TYPE.ACTIVE,
        updatedAt: Date.now(),
      }

      await userModel.updateInfo(userId.toString(), updateStatusUser)

      await deleteLinkPaymentTemp(vnp_TxnRef)

      let baseUrl
      if (userInfo?.role === 'user') {
        baseUrl = `${env.FE_URL}/user/payment/success?`
      } else {
        baseUrl = `${env.FE_URL}/pt/payment/success?`
      }

      const redirectUrl = createRedirectUrl(verify, baseUrl, 'vnpay')

      return {
        success: true,
        url: redirectUrl,
      }
    }

    if (dataToSaveRedis.paymentType === PAYMENT_TYPE.BOOKING) {
      const { idBookingArr } = dataToSaveRedis
      if (vnp_TransactionStatus === '02') {
        idBookingArr.forEach(async (id) => await bookingService.deleteBooking(id))
        await deleteLinkPaymentTemp(vnp_TxnRef)

        return {
          success: false,
          url: `${env.FE_URL}/user/payment/failed`,
        }
      }

      idBookingArr.forEach(async (id) => {
        const result = await bookingService.updateBooking(id, {
          status: BOOKING_STATUS.BOOKING,
        })
        await paymentModel.createNew({
          userId: result.booking.userId.toString(),
          referenceId: result.booking._id.toString(),
          paymentType: PAYMENT_TYPE.BOOKING,
          amount: result.booking.price,
          paymentDate: convertVnpayDateToISO(vnp_PayDate),
          paymentMethod: PAYMENT_METHOD.VNPAY,
          description: result.booking.title,
        })
      })

      await deleteLinkPaymentTemp(vnp_TxnRef)

      const baseUrl = `${env.FE_URL}/user/payment/success?`

      const redirectUrl = createRedirectUrl(verify, baseUrl, 'vnpay')

      return {
        success: true,
        url: redirectUrl,
      }
    }

    if (dataToSaveRedis.paymentType === PAYMENT_TYPE.CLASS) {
      const { userId, classId } = dataToSaveRedis
      if (vnp_TransactionStatus === '02') {
        await deleteLinkPaymentTemp(vnp_TxnRef)

        return {
          success: false,
          url: `${env.FE_URL}/user/payment/failed`,
        }
      }

      // create class enrollment
      const getNew = await classEnrollmentService.addClassEnrollment({
        classId,
        userId,
        paymentStatus: PAYMENT_STATUS.PAID,
        price: vnp_Amount,
        status: CLASS_ENROLLMENT_STATUS.ACTIVE,
      })
      // add id user vào các class session
      await classSessionModel.addUserToClassSessions(userId, classId)

      // create payment
      await paymentModel.createNew({
        userId: userId.toString(),
        referenceId: getNew.enrollment._id.toString(),
        paymentType: PAYMENT_TYPE.CLASS,
        amount: vnp_Amount,
        paymentDate: convertVnpayDateToISO(vnp_PayDate),
        paymentMethod: PAYMENT_METHOD.VNPAY,
        description: vnp_OrderInfo,
      })
      // delete redis
      await deleteLinkPaymentTemp(vnp_TxnRef)
      const baseUrl = `${env.FE_URL}/user/payment/success?`

      const redirectUrl = createRedirectUrl(verify, baseUrl, 'vnpay')

      return {
        success: true,
        url: redirectUrl,
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Lấy danh sách payment theo userId
const getPaymentsByUserId = async (userId, page = 1, limit = 10) => {
  try {
    const result = await paymentModel.getPaymentsByUserId(userId, parseInt(page), parseInt(limit))

    return {
      success: true,
      ...result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateRefundPayment = async (_id, data) => {
  console.log('🚀 ~ updateRefundPayment ~ data:', data)
  try {
    const dataToUpdate = {
      ...data,
      refundDate: new Date().toISOString(),
    }
    console.log('🚀 ~ updateRefundPayment ~ dataToUpdate:', dataToUpdate)
    const result = await paymentModel.updatePaymentById(_id, dataToUpdate)

    return {
      success: true,
      message: 'Refund Successfully',
      result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Lấy danh sách tất cả payment cho admin
const getAllPaymentsForAdmin = async (page = 1, limit = 10) => {
  try {
    const result = await paymentModel.getAllPaymentsForAdmin(parseInt(page), parseInt(limit))

    return {
      success: true,
      ...result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * ============================================
 * HÀM THỐNG KÊ MỚI
 * ============================================
 */

/**
 * Lấy tổng quan thống kê payments (4 cards)
 */
const getPaymentOverviewStats = async (startDate = null, endDate = null) => {
  try {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const result = await paymentStatisticsModel.getOverviewStats(start, end)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy doanh thu theo loại thanh toán (Chart 1)
 */
const getPaymentRevenueByType = async (startDate = null, endDate = null) => {
  try {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const result = await paymentStatisticsModel.getRevenueByPaymentType(start, end)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy xu hướng doanh thu theo thời gian (Chart 2)
 */
const getPaymentRevenueTrend = async (startDate = null, endDate = null, groupBy = 'day') => {
  try {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const result = await paymentStatisticsModel.getRevenueTrend(start, end, groupBy)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy phân bố phương thức thanh toán (Chart 3)
 */
const getPaymentMethodDistribution = async (startDate = null, endDate = null) => {
  try {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const result = await paymentStatisticsModel.getPaymentMethodDistribution(start, end)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy trạng thái thanh toán theo thời gian (Chart 4)
 */
const getPaymentStatusOverTime = async (startDate = null, endDate = null, groupBy = 'day') => {
  try {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const result = await paymentStatisticsModel.getPaymentStatusOverTime(start, end, groupBy)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy tất cả thống kê cùng lúc (tối ưu cho 1 API call)
 */
const getAllPaymentStatistics = async (startDate = null, endDate = null, groupBy = 'day') => {
  try {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    // Gọi tất cả các hàm thống kê song song
    const [overview, revenueByType, revenueTrend, methodDistribution, statusOverTime] = await Promise.all([
      paymentStatisticsModel.getOverviewStats(start, end),
      paymentStatisticsModel.getRevenueByPaymentType(start, end),
      paymentStatisticsModel.getRevenueTrend(start, end, groupBy),
      paymentStatisticsModel.getPaymentMethodDistribution(start, end),
      paymentStatisticsModel.getPaymentStatusOverTime(start, end, groupBy),
    ])

    return {
      success: true,
      data: {
        overview,
        charts: {
          revenueByType,
          revenueTrend,
          methodDistribution,
          statusOverTime,
        },
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy top khách hàng chi tiêu nhiều nhất (Optional - Bonus)
 */
const getTopSpendingCustomers = async (startDate = null, endDate = null, limit = 10) => {
  try {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const result = await paymentStatisticsModel.getTopSpendingCustomers(start, end, limit)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const paymentService = {
  createPaymentVnpay,
  createPaymentBookingPtVnpay,
  createPaymentClassVnpay,
  vnpReturn,
  updateRefundPayment,
  getPaymentsByUserId,
  getAllPaymentsForAdmin,

  // Thống kê mới
  getPaymentOverviewStats,
  getPaymentRevenueByType,
  getPaymentRevenueTrend,
  getPaymentMethodDistribution,
  getPaymentStatusOverTime,
  getAllPaymentStatistics,
  getTopSpendingCustomers,
}
