import { StatusCodes } from 'http-status-codes'
import { progressService } from '../service/progress.service'

// POST / - Tạo mới progress record
const createNew = async (req, res, next) => {
  try {
    const result = await progressService.createNew(req.body)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// GET /:userId - Lấy tất cả progress records của user
const getAllByUserId = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const options = {
      sortBy: req.query.sortBy || 'measurementDate',
      sortOrder: req.query.sortOrder === 'asc' ? 1 : -1,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      skip: req.query.skip ? parseInt(req.query.skip) : undefined,
    }

    const result = await progressService.getAllByUserId(userId, options)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

// GET /detail/:id - Lấy chi tiết một progress record
const getDetailById = async (req, res, next) => {
  try {
    const progressId = req.params.id
    const result = await progressService.getDetailById(progressId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// PUT /:id - Cập nhật progress record
const updateInfo = async (req, res, next) => {
  try {
    const progressId = req.params.id
    const result = await progressService.updateInfo(progressId, req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// DELETE /:id - Xóa progress record
const deleteProgress = async (req, res, next) => {
  try {
    const progressId = req.params.id
    const result = await progressService.deleteProgress(progressId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// GET /latest/:userId - Lấy progress record mới nhất của user
const getLatestByUserId = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const result = await progressService.getLatestByUserId(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// GET /trend/:userId - Lấy dữ liệu xu hướng thay đổi
const getTrendData = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange) : 30

    const result = await progressService.getTrendData(userId, timeRange)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

// GET /comparison/:userId - So sánh với lần đo trước
const getComparisonData = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const result = await progressService.getComparisonData(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// GET /statistics/:userId - Thống kê tổng quan
const getStatistics = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const result = await progressService.getStatistics(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// GET /dashboard/:userId - Lấy tất cả dữ liệu cho dashboard
const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const result = await progressService.getDashboardData(userId)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

export const progressController = {
  createNew,
  getAllByUserId,
  getDetailById,
  updateInfo,
  deleteProgress,
  getLatestByUserId,
  getTrendData,
  getComparisonData,
  getStatistics,
  getDashboardData,
}
