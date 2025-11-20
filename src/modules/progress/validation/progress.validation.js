import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'
import { StatusCodes } from 'http-status-codes'

// Validation cho tạo mới progress record
const createNew = async (req, res, next) => {
  const correctValidation = Joi.object({
    userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    measurementDate: Joi.string().isoDate().allow('').default(''),
    weight: Joi.number().min(1).precision(2).required(),
    bodyFat: Joi.number().min(1).precision(2).required(),
    muscleMass: Joi.number().min(1).precision(2).required(),
    note: Joi.string().trim().allow('').optional(),
  })

  try {
    await correctValidation.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error.message)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

// Validation cho cập nhật progress record
const updateInfo = async (req, res, next) => {
  const correctValidation = Joi.object({
    measurementDate: Joi.string().isoDate().allow('').optional(),
    weight: Joi.number().min(1).precision(2).optional(),
    bodyFat: Joi.number().min(1).precision(2).optional(),
    muscleMass: Joi.number().min(1).precision(2).optional(),
    note: Joi.string().trim().allow('').optional(),
  }).min(1) // Ít nhất phải có 1 field để update

  try {
    await correctValidation.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error.message)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

// Validation cho userId parameter
const validateUserId = async (req, res, next) => {
  const paramValidation = Joi.object({
    userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  })

  try {
    await paramValidation.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error.message)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

// Validation cho progressId parameter
const validateProgressId = async (req, res, next) => {
  const paramValidation = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  })

  try {
    await paramValidation.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error.message)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

// Validation cho query parameters của trend data
const validateTrendQuery = async (req, res, next) => {
  const queryValidation = Joi.object({
    timeRange: Joi.number().min(1).max(365).optional(), // tối đa 1 năm
  })

  try {
    await queryValidation.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error.message)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

// Validation cho query parameters của getAllByUserId
const validateGetAllQuery = async (req, res, next) => {
  const queryValidation = Joi.object({
    sortBy: Joi.string().valid('measurementDate', 'weight', 'bodyFat', 'muscleMass', 'createdAt').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
    limit: Joi.number().min(1).max(100).optional(),
    skip: Joi.number().min(0).optional(),
  })

  try {
    await queryValidation.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error.message)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

export const progressValidation = {
  createNew,
  updateInfo,
  validateUserId,
  validateProgressId,
  validateTrendQuery,
  validateGetAllQuery,
}
