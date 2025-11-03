import { StatusCodes } from 'http-status-codes'
import { subscriptionService } from '../service/subscription.service'

const subscribeMembership = async (req, res, next) => {
  try {
    const result = await subscriptionService.subscribeMembership(req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const subscribeMembershipForStaff = async (req, res, next) => {
  try {
    const result = await subscriptionService.subscribeMembershipForStaff(req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getSubDetailByUserId = async (req, res, next) => {
  try {
    const userId = req.params.id
    const result = await subscriptionService.getSubDetailByUserId(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.OK).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const deleteSubscription = async (req, res, next) => {
  try {
    const subId = req.params.id
    console.log('🚀 ~ deleteSubscription ~ subId:', subId)
    const result = await subscriptionService.deleteSubscription(subId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const subscriptionController = {
  subscribeMembershipForStaff,
  subscribeMembership,
  getSubDetailByUserId,
  deleteSubscription,
}
