import { StatusCodes } from 'http-status-codes'
import { roomService } from '../service/room.service'

const createRoom = async (req, res, next) => {
  try {
    const result = await roomService.createRoom(req.body)

    if (result.success) {
      res.status(StatusCodes.CREATED).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getRoomById = async (req, res, next) => {
  try {
    const roomId = req.params.id
    const result = await roomService.getRoomById(roomId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getRoomsByLocationId = async (req, res, next) => {
  try {
    const locationId = req.params.locationId
    const result = await roomService.getRoomsByLocationId(locationId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getAllRooms = async (req, res, next) => {
  try {
    const result = await roomService.getAllRooms()

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const updateRoom = async (req, res, next) => {
  try {
    const roomId = req.params.id
    const result = await roomService.updateRoom(roomId, req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const deleteRoom = async (req, res, next) => {
  try {
    const roomId = req.params.id
    console.log('🚀 ~ deleteRoom ~ roomId:', roomId)
    const result = await roomService.deleteRoom(roomId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const softDeleteRoom = async (req, res, next) => {
  try {
    const roomId = req.params.id
    const result = await roomService.softDeleteRoom(roomId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getRoomAvailability = async (req, res, next) => {
  try {
    const roomId = req.params.id
    const { date } = req.query // Expected format: YYYY-MM-DD

    if (!date) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Date parameter is required',
      })
    }

    const result = await roomService.getRoomAvailability(roomId, date)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const getListRoomByLocationId = async (req, res, next) => {
  try {
    const locationId = req.params.locationId
    const result = await roomService.getListRoomByLocationId(locationId)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.NOT_FOUND).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// Cập nhật export roomController
export const roomController = {
  createRoom,
  getRoomById,
  getRoomsByLocationId,
  getAllRooms,
  updateRoom,
  deleteRoom,
  softDeleteRoom,
  getRoomAvailability,
  getListRoomByLocationId, // Thêm method mới
}
