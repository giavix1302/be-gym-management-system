import express from 'express'
import { roomController } from '../controller/room.controller'
import { roomValidation } from '../validation/room.validation'

const Router = express.Router()

// Base route: /api/rooms
Router.route('/')
  // Create new room
  .post(roomValidation.createRoom, roomController.createRoom)
  // Get all rooms
  .get(roomController.getAllRooms)

// Route for specific room by ID: /api/rooms/:id
Router.route('/:id')
  // Get room by ID
  .get(roomValidation.validateRoomId, roomController.getRoomById)
  // Update room by ID
  .put(roomValidation.validateRoomId, roomValidation.updateRoom, roomController.updateRoom)
  // Delete room by ID (hard delete)
  .delete(roomValidation.validateRoomId, roomController.deleteRoom)

Router.route('/location/:locationId/sessions').get(roomController.getListRoomByLocationId)

// Route for location's rooms: /api/rooms/location/:locationId
Router.route('/location/:locationId').get(roomValidation.validateLocationId, roomController.getRoomsByLocationId)

// Route for soft delete: /api/rooms/:id/soft-delete
Router.route('/:id/soft-delete').patch(roomValidation.validateRoomId, roomController.softDeleteRoom)

// Route for room availability: /api/rooms/:id/availability?date=YYYY-MM-DD
Router.route('/:id/availability').get(roomValidation.validateRoomId, roomController.getRoomAvailability)

export const roomRoute = Router
