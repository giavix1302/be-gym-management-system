import { StatusCodes } from 'http-status-codes'
import { statisticsService } from '../service/statistics.service'

const getDataDashboardForAdmin = async (req, res, next) => {
  try {
    const result = await statisticsService.getDataDashboardForAdmin()

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getDataDashboardForStaff = async (req, res, next) => {
  try {
    const { locationId } = req.params

    if (!locationId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Location ID is required',
      })
    }

    const result = await statisticsService.getDataDashboardForStaff(locationId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const statisticsController = {
  getDataDashboardForAdmin,
  getDataDashboardForStaff,
}
