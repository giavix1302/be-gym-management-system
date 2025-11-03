import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '~/utils/constants.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'

const SUBSCRIPTION_COLLECTION_NAME = 'subscriptions'
const SUBSCRIPTION_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  membershipId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  startDate: Joi.string().isoDate().allow('').default(''),
  endDate: Joi.string().isoDate().allow('').default(''),
  status: Joi.string().valid(SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.EXPIRED).required(),
  paymentStatus: Joi.string().valid(PAYMENT_STATUS.PAID, PAYMENT_STATUS.UNPAID),
  remainingSessions: Joi.number().min(0).required(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  expireAt: Joi.date().default(() => new Date(Date.now() + 10 * 60 * 1000)), // field TTL
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await SUBSCRIPTION_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createIndexes = async () => {
  try {
    await GET_DB().collection(SUBSCRIPTION_COLLECTION_NAME).createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })
    console.log('✅ TTL index created for subscriptions.expireAt')
  } catch (error) {
    console.error('❌ Error creating TTL index:', error)
  }
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data, { abortEarly: false })
    const newSubscriptionToAdd = {
      ...validData,
      userId: new ObjectId(String(validData.userId)),
      membershipId: new ObjectId(String(validData.membershipId)),
    }
    const createdSubscription = await GET_DB().collection(SUBSCRIPTION_COLLECTION_NAME).insertOne(newSubscriptionToAdd)
    return createdSubscription
  } catch (error) {
    throw new Error(error)
  }
}

// UPDATED: Add _destroy check
const getDetailById = async (subId) => {
  try {
    const sub = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(subId)),
        _destroy: false,
      })
    return sub
  } catch (error) {
    throw new Error(error)
  }
}

// UPDATED: Add _destroy check
const getDetailByUserId = async (userId) => {
  try {
    const sub = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .findOne({
        userId: new ObjectId(String(userId)),
        _destroy: false,
      })
    return sub
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (subId, updateData) => {
  try {
    const updated = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .findOneAndUpdate(
        {
          _id: new ObjectId(String(subId)),
          _destroy: false,
        },
        { $set: updateData },
        { returnDocument: 'after' }
      )
    return updated
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfoWhenPaymentSuccess = async (subId, updateData) => {
  try {
    const updated = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .findOneAndUpdate(
        {
          _id: new ObjectId(String(subId)),
          _destroy: false,
        },
        { $set: updateData, $unset: { expireAt: '' } },
        { returnDocument: 'after' }
      )
    return updated
  } catch (error) {
    throw new Error(error)
  }
}

// UPDATED: Change from hard delete to soft delete
const deleteSubscription = async (subId) => {
  try {
    const result = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .updateOne(
        {
          _id: new ObjectId(String(subId)),
          _destroy: false,
        },
        {
          $set: {
            _destroy: true,
            updatedAt: Date.now(),
          },
        }
      )
    return result.modifiedCount
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Soft delete subscription by userId (useful for cascade operations)
const softDeleteSubscriptionsByUserId = async (userId) => {
  try {
    const result = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .updateMany(
        {
          userId: new ObjectId(String(userId)),
          _destroy: false,
        },
        {
          $set: {
            _destroy: true,
            updatedAt: Date.now(),
          },
        }
      )
    return result.modifiedCount
  } catch (error) {
    throw new Error(error)
  }
}

// ALREADY HAS _destroy check - no change needed
const getActiveSubscriptions = async () => {
  try {
    const activeSubscriptions = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .find({
        status: SUBSCRIPTION_STATUS.ACTIVE,
        paymentStatus: PAYMENT_STATUS.PAID,
        _destroy: false,
      })
      .toArray()

    return activeSubscriptions
  } catch (error) {
    throw new Error(error)
  }
}

// ALREADY HAS _destroy check - no change needed
const getExpiredSubscriptionsInRange = async (startDate, endDate) => {
  try {
    const expiredSubscriptions = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .find({
        endDate: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString(),
        },
        status: SUBSCRIPTION_STATUS.EXPIRED,
        _destroy: false,
      })
      .toArray()

    return expiredSubscriptions
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Get all subscriptions by userId (with _destroy check)
const getSubscriptionsByUserId = async (userId) => {
  try {
    const subscriptions = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .find({
        userId: new ObjectId(String(userId)),
        _destroy: false,
      })
      .sort({ createdAt: -1 })
      .toArray()

    return subscriptions
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Get active subscription by userId
const getActiveSubscriptionByUserId = async (userId) => {
  try {
    const subscription = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .findOne({
        userId: new ObjectId(String(userId)),
        status: SUBSCRIPTION_STATUS.ACTIVE,
        _destroy: false,
      })

    return subscription
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Restore soft deleted subscription
const restoreSubscription = async (subId) => {
  try {
    const result = await GET_DB()
      .collection(SUBSCRIPTION_COLLECTION_NAME)
      .updateOne(
        {
          _id: new ObjectId(String(subId)),
          _destroy: true,
        },
        {
          $set: {
            _destroy: false,
            updatedAt: Date.now(),
          },
        }
      )
    return result.modifiedCount
  } catch (error) {
    throw new Error(error)
  }
}

// Export tất cả các methods
export const subscriptionModel = {
  SUBSCRIPTION_COLLECTION_NAME,
  SUBSCRIPTION_COLLECTION_SCHEMA,
  createIndexes,
  createNew,
  getDetailById,
  updateInfo,
  updateInfoWhenPaymentSuccess,
  getDetailByUserId,
  deleteSubscription, // UPDATED: Now soft delete
  softDeleteSubscriptionsByUserId, // NEW
  getActiveSubscriptions,
  getExpiredSubscriptionsInRange,
  getSubscriptionsByUserId, // NEW
  getActiveSubscriptionByUserId, // NEW
  restoreSubscription, // NEW
}
