import express from 'express'
import { membershipController } from '../controller/membership.controller'
import { upload } from '~/config/cloudinary.config'
import { authMiddleware } from '~/middlewares/auth.middleware'

const Router = express.Router()

// =================================================================================
// CRUD ROUTES
// =================================================================================

Router.route('/')
  .post(upload.single('banner'), membershipController.addMembership)
  .get(membershipController.getListMembership)

Router.route('/:id')
  .put(authMiddleware, upload.single('banner'), membershipController.updateMemberShip)
  .delete(authMiddleware, membershipController.deleteMembership)

// =================================================================================
// ANALYTICS/STATISTICS ROUTES
// =================================================================================

/**
 * GET /api/v1/memberships/analytics/overview
 * Query params: startDate?, endDate?
 * Response: { totalRevenue, totalActive, newMemberships, renewalRate }
 */
Router.get('/analytics/overview', authMiddleware, membershipController.getMembershipOverview)

/**
 * GET /api/v1/memberships/analytics/revenue-chart
 * Query params: startDate (required), endDate (required), groupBy? (day|week|month)
 * Response: [{ period, revenue, count }]
 */
Router.get('/analytics/revenue-chart', authMiddleware, membershipController.getMembershipRevenueChart)

/**
 * GET /api/v1/memberships/analytics/trends-chart
 * Query params: startDate (required), endDate (required), groupBy? (day|week|month)
 * Response: [{ period, newSubscriptions, expiredSubscriptions }]
 */
Router.get('/analytics/trends-chart', authMiddleware, membershipController.getMembershipTrendsChart)

/**
 * GET /api/v1/memberships/analytics/all
 * Query params: startDate (required), endDate (required), groupBy? (day|week|month)
 * Response: { overview: {...}, charts: { revenue: [...], trends: [...] } }
 */
Router.get('/analytics/all', authMiddleware, membershipController.getMembershipAnalytics)

export const memberRoute = Router
