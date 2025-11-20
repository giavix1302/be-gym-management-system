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

export const statisticsController = {
  getDataDashboardForAdmin,
}
