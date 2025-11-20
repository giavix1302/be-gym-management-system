import { StatusCodes } from 'http-status-codes'
import { attendanceService } from '../service/attendance.service'

// POST /toggle - Unified checkin/checkout
const toggleAttendance = async (req, res, next) => {
  try {
    const result = await attendanceService.toggleAttendance(req)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// POST /checkin - Legacy checkin (kept for backward compatibility)
const checkin = async (req, res, next) => {
  try {
    const result = await attendanceService.checkin(req)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// PUT /checkout - Legacy checkout (kept for backward compatibility)
const checkout = async (req, res, next) => {
  try {
    const result = await attendanceService.checkout(req)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// GET /active/:userId - Lấy trạng thái attendance hiện tại
const getActiveAttendance = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const result = await attendanceService.getActiveAttendance(userId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// GET /history/:userId - Lấy lịch sử attendance của user
const getUserHistory = async (req, res, next) => {
  try {
    const userId = req.params.userId
    const { startDate, endDate } = req.query

    const result = await attendanceService.getUserHistory(userId, startDate, endDate)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// GET /:id - Lấy detail attendance
const getDetail = async (req, res, next) => {
  try {
    const attendanceId = req.params.id
    const result = await attendanceService.getDetail(attendanceId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// PUT /:id - Cập nhật thông tin attendance (cho admin)
const updateInfo = async (req, res, next) => {
  try {
    const attendanceId = req.params.id
    const result = await attendanceService.updateInfo(attendanceId, req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// DELETE /:id - Xóa attendance
const deleteAttendance = async (req, res, next) => {
  try {
    const attendanceId = req.params.id
    const result = await attendanceService.deleteAttendance(attendanceId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// GET /location/:locationId - Lấy danh sách attendances theo location (cho admin)
const getLocationAttendances = async (req, res, next) => {
  try {
    const { locationId } = req.params
    const { startDate, endDate } = req.query

    const result = await attendanceService.getLocationAttendances(locationId, startDate, endDate)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// GET /list/:userId - Lấy danh sách attendance có phân trang
const getListAttendanceByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      sortBy = 'checkinTime',
      sortOrder = -1,
      includeDeleted = false,
    } = req.query

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate,
      sortBy,
      sortOrder: parseInt(sortOrder),
      includeDeleted: includeDeleted === 'true',
    }

    const result = await attendanceService.getListAttendanceByUserId(userId, options)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const attendanceController = {
  toggleAttendance, // NEW: Unified checkin/checkout
  checkin, // Legacy
  checkout, // Legacy
  getActiveAttendance,
  getUserHistory,
  getDetail,
  updateInfo,
  deleteAttendance,
  getLocationAttendances,
  getListAttendanceByUserId, // NEW: Get paginated user attendances
}
