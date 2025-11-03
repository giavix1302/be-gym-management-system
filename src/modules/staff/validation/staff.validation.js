import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'
import { MEMBERSHIP_TYPE } from '~/utils/constants.js'

const addMembership = async (req, res, next) => {
  const correctValidation = Joi.object({
    name: Joi.string().required().min(2).trim().strict(),
    durationMonth: Joi.number().min(1).max(120).required(),
    price: Joi.number().min(1).required().required(),
    discount: Joi.number().min(0).max(100).required(),
    description: Joi.string().trim().strict().required(),
    type: Joi.string().valid(MEMBERSHIP_TYPE.GYM, MEMBERSHIP_TYPE.YOGA, MEMBERSHIP_TYPE.BOXING).required(),
    bannerURL: Joi.string().trim().strict().required(),
  })

  try {
    await correctValidation.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

// don't use
const updateProduct = async (req, res, next) => {
  const correctValidation = Joi.object({
    cartId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    quantity: Joi.number().min(1).required(),
  })

  try {
    await correctValidation.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

export const membershipValidation = {
  addMembership,
  updateProduct,
}
