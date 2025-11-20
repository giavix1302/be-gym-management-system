import express from 'express'
import { qrRoute } from './qr.route'
import { faceIdRoute } from './faceid.route'
import { attendanceController } from '../controller/attendance.controller'
import { attendanceValidation } from '../validation/attendance.validation'

const Router = express.Router()

// === Routes phân theo phương thức ===
Router.use('/qr-code', qrRoute)
Router.use('/face-id', faceIdRoute)

// === Các route chung ===

// Lấy trạng thái attendance hiện tại của user
Router.get('/active/:userId', attendanceController.getActiveAttendance)

// Lấy lịch sử attendance của user
Router.get('/history/:userId', attendanceController.getUserHistory)

// NEW: Lấy danh sách attendance với phân trang
Router.get('/list/:userId', attendanceController.getListAttendanceByUserId)

// Lấy danh sách attendances theo location (cho admin)
Router.get('/location/:locationId', attendanceController.getLocationAttendances)

// CRUD operations cho attendance records
Router.route('/:id')
  .get(attendanceController.getDetail)
  .put(attendanceValidation.updateInfo, attendanceController.updateInfo)
  .delete(attendanceController.deleteAttendance)

export const attendanceRoute = Router
