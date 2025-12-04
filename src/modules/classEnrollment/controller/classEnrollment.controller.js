import { StatusCodes } from 'http-status-codes'
import { classEnrollmentService } from '../service/classEnrollment.service'

const addClassEnrollment = async (req, res, next) => {
  try {
    const result = await classEnrollmentService.addClassEnrollment(req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListClassEnrollment = async (req, res, next) => {
  try {
    const result = await classEnrollmentService.getListClassEnrollment()

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const updateClassEnrollment = async (req, res, next) => {
  try {
    const result = await classEnrollmentService.updateClassEnrollment(req)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const deleteClassEnrollment = async (req, res, next) => {
  try {
    const enrollmentId = req.params.id

    const result = await classEnrollmentService.deleteClassEnrollment(enrollmentId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const cancelClassEnrollment = async (req, res, next) => {
  try {
    const enrollmentId = req.params.id

    const result = await classEnrollmentService.cancelClassEnrollment(enrollmentId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const classEnrollmentController = {
  addClassEnrollment,
  updateClassEnrollment,
  deleteClassEnrollment,
  getListClassEnrollment,
  cancelClassEnrollment,
}
