import express from 'express'
import { userController } from '~/modules/user/controller/user.controller.js'
import { userValidation } from '../validation/user.validation'

const Router = express.Router()

// Existing routes
// Router.route('/')
//   .post(userValidation.createNew, userController.createNew)

Router.route('/').post(userController.createNew)

Router.route('/:id').get(userController.getDetail).put(userValidation.updateInfo, userController.updateInfo)

// no auth
Router.route('/reset-password').post(userController.resetPassword)

// NEW: Routes cho admin
// GET /users/admin/list?page=1&limit=20
Router.route('/admin/list').get(userController.getListUserForAdmin)

// NEW: Routes cho staff
// GET /users/staff/list?page=1&limit=20
Router.route('/staff/list').get(userController.getListUserForStaff)

// DELETE /users/:id/soft-delete
Router.route('/:id/soft-delete').delete(userController.softDeleteUser)

export const userRoute = Router
