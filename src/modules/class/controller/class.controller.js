import { StatusCodes } from 'http-status-codes'
import { classService } from '../service/class.service'

const addClass = async (req, res, next) => {
  try {
    const result = await classService.addClass(req)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListClasses = async (req, res, next) => {
  try {
    const result = await classService.getListClasses()

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListClassInfoForAdmin = async (req, res, next) => {
  try {
    const result = await classService.getListClassInfoForAdmin()

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListClassInfoForUser = async (req, res, next) => {
  try {
    const result = await classService.getListClassInfoForUser()

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListClassInfoForTrainer = async (req, res, next) => {
  try {
    const trainerId = req.params.id
    const result = await classService.getListClassInfoForTrainer(trainerId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getClassDetail = async (req, res, next) => {
  try {
    const classId = req.params.id
    const result = await classService.getClassDetail(classId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const updateClass = async (req, res, next) => {
  try {
    const result = await classService.updateClass(req)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const deleteClass = async (req, res, next) => {
  try {
    const classId = req.params.id
    const result = await classService.deleteClass(classId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getClassesByType = async (req, res, next) => {
  try {
    const classType = req.params.type
    const result = await classService.getClassesByType(classType)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getMemberEnrolledClasses = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const result = await classService.getMemberEnrolledClasses(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListClassByLocationId = async (req, res, next) => {
  try {
    const locationId = req.params.locationId
    const result = await classService.getListClassByLocationId(locationId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const classController = {
  addClass,
  getListClasses,
  getClassDetail,
  updateClass,
  deleteClass,
  getClassesByType,
  getListClassInfoForAdmin,
  getListClassInfoForUser,
  getMemberEnrolledClasses,
  getListClassInfoForTrainer,
  getListClassByLocationId,
}
