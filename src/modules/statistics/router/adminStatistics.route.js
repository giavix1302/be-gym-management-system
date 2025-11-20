import express from 'express'
import { statisticsController } from '../controller/statistics.controller'

const router = express.Router()

// Chỉ admin mới được truy cập
router.get('/dashboard', statisticsController.getDataDashboardForAdmin)

export default router
