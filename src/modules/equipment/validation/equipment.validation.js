import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import { EQUIPMENT_STATUS } from '~/utils/constants.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'

const addMaintenanceRecord = async (req, res, next) => {
  const correctValidation = Joi.object({
    date: Joi.string().isoDate().required(),
    details: Joi.string().min(1).max(500).trim().strict().required(),
    technician: Joi.string().min(1).max(100).trim().strict().required(),
    cost: Joi.number().min(0).optional(),
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

const updateMaintenanceRecord = async (req, res, next) => {
  const correctValidation = Joi.object({
    date: Joi.string().isoDate().optional(),
    details: Joi.string().min(1).max(500).trim().strict().optional(),
    technician: Joi.string().min(1).max(100).trim().strict().optional(),
    cost: Joi.number().min(0).optional(),
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

const validateEquipmentId = async (req, res, next) => {
  const correctValidation = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  })

  try {
    await correctValidation.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

const validateLocationId = async (req, res, next) => {
  const correctValidation = Joi.object({
    locationId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  })

  try {
    await correctValidation.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

const validateMaintenanceIndex = async (req, res, next) => {
  const correctValidation = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    maintenanceIndex: Joi.number().integer().min(0).required(),
  })

  try {
    await correctValidation.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

const validateStatus = async (req, res, next) => {
  const correctValidation = Joi.object({
    status: Joi.string()
      .valid(EQUIPMENT_STATUS.ACTIVE, EQUIPMENT_STATUS.MAINTENANCE, EQUIPMENT_STATUS.BROKEN)
      .required(),
  })

  try {
    await correctValidation.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

const validateSearchQuery = async (req, res, next) => {
  const correctValidation = Joi.object({
    q: Joi.string().min(1).max(100).trim().required(),
  })

  try {
    await correctValidation.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    const validationError = new Error(error)
    validationError.statusCode = StatusCodes.UNPROCESSABLE_ENTITY
    next(validationError)
  }
}

export const equipmentValidation = {
  addMaintenanceRecord,
  updateMaintenanceRecord,
  validateEquipmentId,
  validateLocationId,
  validateMaintenanceIndex,
  validateStatus,
  validateSearchQuery,
}
