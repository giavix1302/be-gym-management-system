import { StatusCodes } from 'http-status-codes'
import { staffService } from '../service/staff.service'

/**
 * Add new staff
 */
const signupForStaff = async (req, res, next) => {
  try {
    const result = await staffService.signupForStaff(req.body)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const verifyForStaff = async (req, res, next) => {
  try {
    const result = await staffService.verifyForStaff(req.body)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get list of all staff
 */
const getListStaff = async (req, res, next) => {
  try {
    const result = await staffService.getListStaff()

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get staff details by ID
 */
const getDetailByUserId = async (req, res, next) => {
  try {
    const userId = req.params.id
    const result = await staffService.getDetailByUserId(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Update staff information
 */
const updateStaff = async (req, res, next) => {
  try {
    const result = await staffService.updateStaff(req)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Soft delete staff (set _destroy flag)
 */
const deleteStaff = async (req, res, next) => {
  try {
    const staffId = req.params.id
    const result = await staffService.deleteStaff(staffId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Hard delete staff (permanently remove from database)
 */
const hardDeleteStaff = async (req, res, next) => {
  try {
    const staffId = req.params.id
    const result = await staffService.hardDeleteStaff(staffId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const staffController = {
  signupForStaff,
  verifyForStaff,
  getListStaff,
  getDetailByUserId,
  updateStaff,
  deleteStaff,
  hardDeleteStaff,
}
