import { membershipModel } from '~/modules/membership/model/membership.model'
import { paymentService } from '~/modules/payment/service/payment.service'
import { userModel } from '~/modules/user/model/user.model'
import { notificationService } from '~/modules/notification/service/notification.service'
import { calculateEndDate, countRemainingDays, sanitize } from '~/utils/utils'
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS, STATUS_TYPE, PAYMENT_TYPE } from '~/utils/constants.js'
import { subscriptionModel } from '../model/subscription.model'
import { getLinkPaymentTemp } from '~/utils/redis'
import { paymentModel } from '~/modules/payment/model/payment.model'

const subscribeMembership = async (data) => {
  try {
    const { userId, membershipId } = data

    // check id
    const isUserExist = await userModel.getDetailById(userId)
    console.log('🚀 ~ subscribeMembership ~ isUserExist:', isUserExist)
    if (isUserExist === null) return { success: false, message: 'User not found' }

    const isMembershipExist = await membershipModel.getDetailById(membershipId)
    console.log('🚀 ~ subscribeMembership ~ isMembershipExist:', isMembershipExist)
    if (isMembershipExist === null) return { success: false, message: 'Membership not found' }

    // Xóa notification cũ nếu user gia hạn membership mới
    const existingSubscription = await subscriptionModel.getDetailByUserId(userId)
    if (existingSubscription) {
      await notificationService.deleteNotificationsByReference(existingSubscription._id.toString(), 'MEMBERSHIP')
    }

    const dataToSave = {
      userId,
      membershipId,
      status: SUBSCRIPTION_STATUS.EXPIRED,
      paymentStatus: PAYMENT_STATUS.UNPAID,
      remainingSessions: 0,
    }

    const result = await subscriptionModel.createNew(dataToSave)

    if (result.insertedId) {
      // update status user
      await userModel.updateInfo(userId, { status: STATUS_TYPE.ACTIVE })
    }

    return {
      success: true,
      message: 'Subscription created successfully',
      subscriptionId: result.insertedId,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const subscribeMembershipForStaff = async (data) => {
  try {
    const { userId, membershipId, paymentMethod, price, description } = data

    // check
    const isUserExist = await userModel.getDetailById(userId)
    console.log('🚀 ~ subscribeMembership ~ isUserExist:', isUserExist)
    if (isUserExist === null) return { success: false, message: 'User not found' }

    const isMembershipExist = await membershipModel.getDetailById(membershipId)
    console.log('🚀 ~ subscribeMembership ~ isMembershipExist:', isMembershipExist)
    if (isMembershipExist === null) return { success: false, message: 'Membership not found' }

    // Xóa notification cũ nếu user gia hạn membership mới
    const existingSubscription = await subscriptionModel.getDetailByUserId(userId)
    if (existingSubscription) {
      await notificationService.deleteNotificationsByReference(existingSubscription._id.toString(), 'MEMBERSHIP')
    }

    // create sub
    const dataToSave = {
      userId,
      membershipId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      paymentStatus: PAYMENT_STATUS.PAID,
      startDate: new Date().toISOString(),
      endDate: calculateEndDate(new Date().toISOString(), isMembershipExist.durationMonth),
      remainingSessions: countRemainingDays(
        calculateEndDate(new Date().toISOString(), isMembershipExist.durationMonth)
      ),
    }

    const result = await subscriptionModel.createNew(dataToSave)

    // create payment: userId, price, refId, paymentType, method, description
    const dataToCreatePayment = {
      userId: userId.toString(),
      referenceId: result.insertedId.toString(),
      paymentType: PAYMENT_TYPE.MEMBERSHIP,
      amount: price,
      paymentDate: new Date().toISOString(),
      paymentMethod: paymentMethod,
      description: description,
    }
    const resultPayment = await paymentModel.createNew(dataToCreatePayment)
    console.log('🚀 ~ subscribeMembershipForStaff ~ resultPayment:', resultPayment)

    if (resultPayment.insertedId) {
      // update status user
      await userModel.updateInfo(userId, { status: STATUS_TYPE.ACTIVE })
    }

    return {
      success: true,
      message: 'Subscription created successfully',
      subscriptionId: result.insertedId,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getSubDetailByUserId = async (userId) => {
  try {
    // check id
    const existingSub = await subscriptionModel.getDetailByUserId(userId)
    console.log('🚀 ~ getSubDetailByUserId ~ existingSub:', existingSub)
    // get sub
    if (existingSub === null)
      return {
        success: false,
        message: 'Subscription not found',
        myMembership: {
          _id: '',
          remainingSessions: 0,
          startDate: '',
          endDate: '',
          status: '',
          name: '',
          durationMonth: 0,
          bannerURL: '',
          totalCheckin: 0,
        },
      }
    const { status, endDate, _id, membershipId } = existingSub
    const updateRemainingSessions = countRemainingDays(endDate)

    let updatedStatus = status
    if (updateRemainingSessions === 0) {
      updatedStatus = SUBSCRIPTION_STATUS.EXPIRED

      // update status in user === inactive
      await userModel.updateInfo(userId, { status: STATUS_TYPE.INACTIVE })
    }

    const dataToUpdate = {
      status: updatedStatus,
      remainingSessions: updateRemainingSessions,
    }
    // update
    const result = await subscriptionModel.updateInfo(_id, dataToUpdate)
    console.log('🚀 ~ getSubDetailByUserId ~ result:', result)

    // get data membership
    const membershipInfo = await membershipModel.getDetailById(membershipId)

    const { name, durationMonth, bannerURL } = membershipInfo

    const dataFinal = {
      ...result,
      name,
      durationMonth,
      bannerURL,
      totalCheckin: 0,
    }

    return {
      success: true,
      message: 'Subscription got successfully',
      subscription: dataFinal,
    }
  } catch (error) {
    throw new Error(error)
  }
}

// unable
const updateSubscription = async (subscriptionId, data) => {
  try {
    // check id
    const isSubscriptionExist = await subscriptionModel.getDetailById(subscriptionId)
    console.log('🚀 ~ subscribeMembership ~ isSubscriptionExist:', isSubscriptionExist)
    if (isSubscriptionExist === null) return { success: false, message: 'User not found' }

    const dataToSave = {}

    const result = await subscriptionModel.createNew(dataToSave)

    // handle create

    return {
      success: true,
      message: 'Subscription created successfully',
      _id: result.insertedId,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteSubscription = async (subscriptionId) => {
  try {
    // Xóa các notification liên quan trước khi xóa subscription
    await notificationService.deleteNotificationsByReference(subscriptionId, 'MEMBERSHIP')

    const subInfo = await subscriptionModel.getDetailById(subscriptionId)

    const { userId } = subInfo

    await userModel.updateInfo(userId.toString(), { status: STATUS_TYPE.INACTIVE })

    // Xóa subscription
    const result = await subscriptionModel.deleteSubscription(subscriptionId)

    return {
      success: true,
      message: 'Subscription and related notifications deleted successfully',
      result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const subscriptionService = {
  subscribeMembership,
  subscribeMembershipForStaff,
  updateSubscription,
  getSubDetailByUserId,
  deleteSubscription,
}
