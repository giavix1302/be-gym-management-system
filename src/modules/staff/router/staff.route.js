import express from 'express'
import { staffController } from '../controller/staff.controller'
import { authMiddleware } from '~/middlewares/auth.middleware'

const Router = express.Router()

// ==================== EXISTING ROUTES ====================

// Routes for staff collection
Router.route('/').get(staffController.getListStaff) // Get all staff

// create
Router.route('/create/signup').post(staffController.signupForStaff)
Router.route('/create/verify').post(staffController.verifyForStaff)

// Routes for specific staff by ID
Router.route('/:id')
  .get(staffController.getDetailByUserId) // Get staff by ID
  .put(authMiddleware, staffController.updateStaff) // Update staff
  .delete(authMiddleware, staffController.deleteStaff) // Soft delete staff

// Route for hard delete (permanent deletion)
Router.route('/:id/hard-delete').delete(authMiddleware, staffController.hardDeleteStaff) // Hard delete staff

Router.route('/:id/logout').put(staffController.handleLogoutStaff)

// ==================== STATISTICS ROUTES ====================

/**
 * Staff Statistics Routes
 * All routes support query parameters for filtering:
 * - startDate: Start date for time range (ISO string)
 * - endDate: End date for time range (ISO string)
 */

// Overview statistics (4 cards)
Router.route('/statistics/overview').get(staffController.getStaffOverview)
// GET /staff/statistics/overview?startDate=2023-01-01&endDate=2023-12-31

// Working hours by staff chart
Router.route('/statistics/working-hours-by-staff').get(staffController.getWorkingHoursByStaff)
// GET /staff/statistics/working-hours-by-staff?startDate=2023-01-01&endDate=2023-12-31&limit=10

// Checkin trend chart
Router.route('/statistics/checkin-trend').get(staffController.getCheckinTrend)
// GET /staff/statistics/checkin-trend?startDate=2023-01-01&endDate=2023-12-31&groupBy=day

// Top working staff chart
Router.route('/statistics/top-working-staff').get(staffController.getTopWorkingStaff)
// GET /staff/statistics/top-working-staff?startDate=2023-01-01&endDate=2023-12-31&limit=10

// Salary cost by location chart
Router.route('/statistics/salary-cost-by-location').get(staffController.getSalaryCostByLocation)
// GET /staff/statistics/salary-cost-by-location?startDate=2023-01-01&endDate=2023-12-31

// ==================== PERSONAL STATISTICS ROUTES ====================

/**
 * Personal Staff Statistics Routes
 * These routes are for individual staff members to view their own statistics
 * All routes require staffId as URL parameter
 */

// Personal overview statistics (3 cards)
Router.route('/:id/my-statistics/overview').get(staffController.getMyStatistics)
// GET /staff/:id/my-statistics/overview?startDate=2023-01-01&endDate=2023-12-31

// Personal working hours chart
Router.route('/:id/my-statistics/working-hours').get(staffController.getMyWorkingHoursChart)
// GET /staff/:id/my-statistics/working-hours?startDate=2023-01-01&endDate=2023-12-31&groupBy=week

// Personal income chart
Router.route('/:id/my-statistics/income').get(staffController.getMyIncomeChart)
// GET /staff/:id/my-statistics/income?startDate=2023-01-01&endDate=2023-12-31&groupBy=week

export const staffRoute = Router
