import { StatusCodes } from 'http-status-codes'
import { locationService } from '../service/location.service'

const createNew = async (req, res, next) => {
  try {
    const result = await locationService.createNew(req)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListLocation = async (req, res, next) => {
  try {
    const result = await locationService.getListLocation()
    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListLocationForAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10

    const result = await locationService.getListLocationForAdmin(page, limit)
    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const updateInfo = async (req, res, next) => {
  try {
    const locationId = req.params.id
    const result = await locationService.updateInfo(locationId, req)
    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const deleteLocation = async (req, res, next) => {
  try {
    const locationId = req.params.id
    const result = await locationService.deleteLocation(locationId)
    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const locationController = {
  createNew,
  getListLocation,
  getListLocationForAdmin,
  updateInfo,
  deleteLocation,
}
