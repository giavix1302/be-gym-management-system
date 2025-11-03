import { membershipModel } from '~/modules/membership/model/membership.model'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model'
import {
  BOOKING_STATUS,
  CLASS_ENROLLMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
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
import { deleteLinkPaymentTemp, getLinkPaymentTemp, saveLinkPaymentTemp } from '~/utils/redis'
import { bookingModel } from '~/modules/booking/model/booking.model'
import { bookingService } from '~/modules/booking/service/booking.service'
import { classEnrollmentModel } from '~/modules/classEnrollment/model/classEnrollment.model'
import { classEnrollmentService } from '~/modules/classEnrollment/service/classEnrollment.service'
import { classSessionModel } from '~/modules/classSession/model/classSession.model'
import { userModel } from '~/modules/user/model/user.model'

const createPaymentVnpay = async (params) => {
  try {
    // info sub
    const subscriptionInfo = await subscriptionModel.getDetailById(params.id)
    const { membershipId, userId } = subscriptionInfo
    console.log('🚀 ~ createPaymentVnpay ~ membershipId:', membershipId)

    // price, SubId, mess
    const membershipInfo = await membershipModel.getDetailById(membershipId.toString())
    const { price, name, discount } = membershipInfo

    const id = idFromTimestamp()

    // create payment url: subId, price, name
    const paymentUrl = createPaymentURL(id, calculateDiscountedPrice(price, discount).finalPrice, name)

    const expireAt = new Date(Date.now() + 10 * 60 * 1000)
    await saveLinkPaymentTemp(id, {
      subId: params.id,
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

// 🚀 ~ vnpReturn ~ verify: {
//   vnp_Amount: 300000,
//   vnp_BankCode: 'NCB',
//   vnp_BankTranNo: 'VNP15141635',
//   vnp_CardType: 'ATM',
//   vnp_OrderInfo: 'Thanh toán Trọn gói tập gym 1 tháng mã: 68a70226139fa5dda393d979',
//   vnp_PayDate: '20250821213944',
//   vnp_ResponseCode: '00',
//   vnp_TmnCode: 'I75N6KW3',
//   vnp_TransactionNo: '15141635',
//   vnp_TransactionStatus: '00',
//   vnp_TxnRef: '68a70226139fa5dda393d979',
//   isVerified: true,
//   isSuccess: true,
//   message: 'Giao dịch thành công'
// }

const createPaymentBookingPtVnpay = async (data) => {
  try {
    let dataArr = Array.isArray(data) ? data : []
    console.log('🚀 ~ createPaymentBookingPtVnpay ~ dataArr:', dataArr)
    if (dataArr.length === 0) return { success: false, message: 'Data is not correct' }

    let idBookingArr = []
    let titlePayment = ''

    const totalPrice = dataArr.reduce((sum, item) => sum + item.price, 0)

    for (const dataBooking of dataArr) {
      const result = await bookingService.createBooking(dataBooking)
      if (!result.success) {
        return {
          ...result,
        }
      }
      idBookingArr.push(result.bookingId)
    }

    if (dataArr.length === 1) {
      titlePayment = dataArr[0].title
    } else {
      titlePayment = dataArr.length + 'buổi huấn luyện 1 kèm 1'
    }

    const id = idFromTimestamp()

    const paymentUrl = createPaymentURL(id, totalPrice, titlePayment)
    console.log('🚀 ~ createPaymentBookingPtVnpay ~ totalPrice:', totalPrice)

    // tạo 1 mảng lưu id trong redis
    const expireAt = new Date(Date.now() + 10 * 60 * 1000)
    await saveLinkPaymentTemp(id, {
      idBookingArr,
      paymentUrl,
      paymentType: PAYMENT_TYPE.BOOKING,
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

    if (dataToSaveRedis.paymentType === PAYMENT_TYPE.MEMBERSHIP) {
      const { subId } = dataToSaveRedis
      if (vnp_TransactionStatus === '02') {
        // xóa subscription
        await subscriptionModel.deleteSubscription(subId)
        await deleteLinkPaymentTemp(vnp_TxnRef)

        return {
          success: false,
          url: `${env.FE_URL}/user/payment/failed`,
        }
      }

      // get membershipId, userId
      const subscriptionInfo = await subscriptionModel.getDetailById(subId)
      const { userId, membershipId } = subscriptionInfo
      const membershipInfo = await membershipModel.getDetailById(membershipId)
      const { durationMonth } = membershipInfo
      const userInfo = await userModel.getDetailById(userId)

      // create payment: userId, price, refId, paymentType, method, description
      const dataToSave = {
        userId: userId.toString(),
        referenceId: subId,
        paymentType: PAYMENT_TYPE.MEMBERSHIP,
        amount: vnp_Amount,
        paymentDate: convertVnpayDateToISO(vnp_PayDate),
        paymentMethod: PAYMENT_METHOD.VNPAY,
        description: vnp_OrderInfo,
      }
      console.log('🚀 ~ vnpReturn ~ dataToSave:', dataToSave)
      await paymentModel.createNew(dataToSave)

      // update subscription
      const dataUpdateSub = {
        startDate: convertVnpayDateToISO(vnp_PayDate),
        endDate: calculateEndDate(convertVnpayDateToISO(vnp_PayDate), durationMonth),
        status: SUBSCRIPTION_STATUS.ACTIVE,
        paymentStatus: PAYMENT_STATUS.PAID,
        remainingSessions: countRemainingDays(calculateEndDate(convertVnpayDateToISO(vnp_PayDate), durationMonth)),
      }

      await subscriptionModel.updateInfoWhenPaymentSuccess(subId, dataUpdateSub)

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
      // "classId": "68dfb0a182f64303648ccabc",
      // "userId": "68ba6bdcf9c9e7b2c118b999",
      // "paymentStatus": "paid",
      // "price": 300000,
      // "status": "active"
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

export const paymentService = {
  createPaymentVnpay,
  createPaymentBookingPtVnpay,
  createPaymentClassVnpay,
  vnpReturn,
}
