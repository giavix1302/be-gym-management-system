import express from 'express'
import { staffController } from '../controller/staff.controller'
import { authMiddleware } from '~/middlewares/auth.middleware'

const Router = express.Router()

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

export const staffRoute = Router
