import { StatusCodes } from 'http-status-codes'
import { userService } from '../service/user.service.js'

const createNew = async (req, res, next) => {
  try {
    const newUser = await userService.createNew(req.body)

    res.status(StatusCodes.CREATED).json(newUser)
  } catch (error) {
    next(error)
  }
}

const getDetail = async (req, res, next) => {
  try {
    const userId = req.params.id
    const user = await userService.getDetail(userId)
    res.status(StatusCodes.OK).json(user)
  } catch (error) {
    next(error)
  }
}

const updateInfo = async (req, res, next) => {
  try {
    const userId = req.params.id
    const result = await userService.updateInfo(userId, req.body)
    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// NEW: Lấy danh sách user cho admin
const getListUserForAdmin = async (req, res, next) => {
  try {
    // Lấy page và limit từ query params, có default values
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    // Validate page và limit
    if (page < 1) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Page must be greater than 0',
      })
    }

    if (limit < 1 || limit > 100) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Limit must be between 1 and 100',
      })
    }

    const result = await userService.getListUserForAdmin(page, limit)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

// NEW: Lấy danh sách user cho staff
const getListUserForStaff = async (req, res, next) => {
  try {
    // Lấy page và limit từ query params, có default values
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    // Validate page và limit
    if (page < 1) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Page must be greater than 0',
      })
    }

    if (limit < 1 || limit > 100) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Limit must be between 1 and 100',
      })
    }

    const result = await userService.getListUserForStaff(page, limit)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

// NEW: Xóa mềm user
const softDeleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id
    const result = await userService.softDeleteUser(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      // Trả về status code phù hợp tùy vào message
      if (result.message.includes('not found')) {
        res.status(StatusCodes.NOT_FOUND).json(result)
      } else if (
        result.message.includes('active subscription') ||
        result.message.includes('checked in') ||
        result.message.includes('ongoing or upcoming bookings')
      ) {
        res.status(StatusCodes.CONFLICT).json(result)
      } else {
        res.status(StatusCodes.BAD_REQUEST).json(result)
      }
    }
  } catch (error) {
    next(error)
  }
}

export const userController = {
  createNew,
  getDetail,
  updateInfo,
  getListUserForAdmin, // NEW
  getListUserForStaff, // NEW
  softDeleteUser, // NEW
}
