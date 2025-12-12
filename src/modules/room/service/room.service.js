import { roomModel } from '../model/room.model'
// Import location model based on your project structure
// import { locationModel } from '~/modules/location/model/location.model'
import { sanitize } from '~/utils/utils'

const createRoom = async (data) => {
  try {
    const { locationId, name, capacity } = data

    const dataToSave = {
      locationId,
      name: name.trim(),
      capacity,
    }

    const result = await roomModel.createNew(dataToSave)

    return {
      success: true,
      message: 'Room created successfully',
      roomId: result.insertedId,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getRoomById = async (roomId) => {
  try {
    const room = await roomModel.getDetail(roomId)
    console.log('🚀 ~ getRoomById ~ room:', room)

    if (room === null) {
      return {
        success: false,
        message: 'Room not found',
      }
    }

    return {
      success: true,
      message: 'Room retrieved successfully',
      room: sanitize(room),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getRoomsByLocationId = async (locationId) => {
  try {
    // Validate location exists (uncomment when location model is available)
    // const isLocationExist = await locationModel.getDetailById(locationId)
    // if (isLocationExist === null) return { success: false, message: 'Location not found' }

    const rooms = await roomModel.getRoomsByLocationId(locationId)
    console.log('🚀 ~ getRoomsByLocationId ~ rooms:', rooms)

    return {
      success: true,
      message: 'Location rooms retrieved successfully',
      rooms: rooms.map((room) => sanitize(room)),
      total: rooms.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getAllRooms = async () => {
  try {
    const rooms = await roomModel.getAllRooms()
    console.log('🚀 ~ getAllRooms ~ rooms count:', rooms.length)

    return {
      success: true,
      message: 'All rooms retrieved successfully',
      rooms: rooms.map((room) => sanitize(room)),
      total: rooms.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateRoom = async (roomId, data) => {
  try {
    // Check if room exists
    const isRoomExist = await roomModel.getDetail(roomId)
    console.log('🚀 ~ updateRoom ~ isRoomExist:', isRoomExist)
    if (isRoomExist === null) return { success: false, message: 'Room not found' }

    // If updating name, check for duplicates in the same location
    if (data.name) {
      const locationIdToCheck = data.locationId || isRoomExist.locationId
      const isRoomNameExists = await roomModel.checkRoomNameExists(locationIdToCheck, data.name, roomId)
      if (isRoomNameExists) {
        return {
          success: false,
          message: 'Room name already exists in this location',
        }
      }
    }

    // If updating locationId, validate it exists (uncomment when location model is available)
    // if (data.locationId) {
    //   const isLocationExist = await locationModel.getDetailById(data.locationId)
    //   if (isLocationExist === null) return { success: false, message: 'Location not found' }
    // }

    const dataToUpdate = {}

    if (data.locationId) dataToUpdate.locationId = data.locationId
    if (data.name) dataToUpdate.name = data.name.trim()
    if (data.capacity) dataToUpdate.capacity = data.capacity

    const result = await roomModel.updateInfo(roomId, dataToUpdate)
    console.log('🚀 ~ updateRoom ~ result:', result)

    if (result === null) {
      return {
        success: false,
        message: 'Failed to update room',
      }
    }

    return {
      success: true,
      message: 'Room updated successfully',
      room: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteRoom = async (roomId) => {
  try {
    // Check if room exists
    const isRoomExist = await roomModel.getDetail(roomId)
    console.log('🚀 ~ deleteRoom ~ isRoomExist:', isRoomExist)
    if (isRoomExist === null) return { success: false, message: 'Room not found' }

    // TODO: Add business logic validation
    // - Check if room has active bookings
    // - Check if room is referenced in schedules
    // Example:
    // const hasActiveBookings = await bookingModel.checkActiveBookingsByRoomId(roomId)
    // if (hasActiveBookings) {
    //   return { success: false, message: 'Cannot delete room with active bookings' }
    // }

    const result = await roomModel.deleteRoom(roomId)
    console.log('🚀 ~ deleteRoom ~ result:', result)

    if (result === 0) {
      return {
        success: false,
        message: 'Failed to delete room',
      }
    }

    return {
      success: true,
      message: 'Room deleted successfully',
      deletedCount: result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const softDeleteRoom = async (roomId) => {
  try {
    // Check if room exists
    const isRoomExist = await roomModel.getDetail(roomId)
    console.log('🚀 ~ softDeleteRoom ~ isRoomExist:', isRoomExist)
    if (isRoomExist === null) return { success: false, message: 'Room not found' }

    const result = await roomModel.softDeleteRoom(roomId)
    console.log('🚀 ~ softDeleteRoom ~ result:', result)

    if (result === null) {
      return {
        success: false,
        message: 'Failed to soft delete room',
      }
    }

    return {
      success: true,
      message: 'Room soft deleted successfully',
      room: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getRoomAvailability = async (roomId, date) => {
  try {
    const room = await roomModel.getDetail(roomId)
    if (room === null) return { success: false, message: 'Room not found' }

    // TODO: Implement availability check logic
    // - Check room schedules for the given date
    // - Check existing bookings for the given date
    // - Return available time slots

    return {
      success: true,
      message: 'Room availability retrieved successfully',
      room: sanitize(room),
      date,
      availableSlots: [], // Implement this logic
      capacity: room.capacity,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getListRoomByLocationId = async (locationId) => {
  try {
    // Validate location exists (uncomment when location model is available)
    // const isLocationExist = await locationModel.getDetailById(locationId)
    // if (isLocationExist === null) return { success: false, message: 'Location not found' }

    const rooms = await roomModel.getListRoomWithClassSessionsByLocationId(locationId)
    console.log('🚀 ~ getListRoomByLocationId ~ rooms count:', rooms.length)

    return {
      success: true,
      message: 'Location rooms with class sessions retrieved successfully',
      data: rooms, // Trả về trực tiếp array rooms như format yêu cầu
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Cập nhật export roomService
export const roomService = {
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
