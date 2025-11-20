import express from 'express'
import adminStatisticsRoute from './adminStatistics.route.js'
import staffStatisticsRoute from './staffStatistics.route.js'

const Router = express.Router()

// Routes for staff collection
Router.use('/admin', adminStatisticsRoute)
Router.use('/staff', staffStatisticsRoute)

export const statisticsRoute = Router
