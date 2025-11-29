import express from 'express'
import { statisticsController } from '../controller/statistics.controller'

const router = express.Router()

// mẫu
//router.get('/dashboard', statisticsController.getDataDashboardForAdmin)
router.get('/dashboard/:locationId', statisticsController.getDataDashboardForStaff)

export default router
