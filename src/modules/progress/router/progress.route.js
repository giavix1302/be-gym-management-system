import express from 'express'
import { progressController } from '../controller/progress.controller'
import { progressValidation } from '../validation/progress.validation'

const Router = express.Router()

// POST / - Tạo mới progress record
Router.route('/').post(progressValidation.createNew, progressController.createNew)

// GET /:userId - Lấy tất cả progress records của user (có thể có query params)
Router.route('/:userId').get(progressController.getAllByUserId)

// GET /detail/:id - Lấy chi tiết một progress record
Router.route('/detail/:id').get(progressController.getDetailById)

// PUT /:id - Cập nhật progress record
// DELETE /:id - Xóa progress record
Router.route('/:id')
  .put(progressValidation.updateInfo, progressController.updateInfo)
  .delete(progressController.deleteProgress)

// GET /latest/:userId - Lấy progress record mới nhất của user
Router.route('/latest/:userId').get(progressController.getLatestByUserId)

// GET /trend/:userId - Lấy dữ liệu xu hướng thay đổi (có thể có query param timeRange)
Router.route('/trend/:userId').get(progressController.getTrendData)

// GET /comparison/:userId - So sánh với lần đo trước
Router.route('/comparison/:userId').get(progressController.getComparisonData)

// GET /statistics/:userId - Thống kê tổng quan
Router.route('/statistics/:userId').get(progressController.getStatistics)

// GET /dashboard/:userId - Lấy tất cả dữ liệu cho dashboard
Router.route('/dashboard/:userId').get(progressController.getDashboardData)

export const progressRoute = Router
