import express from 'express'
import { userController } from '~/modules/user/controller/user.controller.js'
import { userValidation } from '../validation/user.validation'
import { upload } from '~/config/cloudinary.config'

const Router = express.Router()

// Existing routes
// Router.route('/')
//   .post(userValidation.createNew, userController.createNew)

Router.route('/').post(userController.createNew)

Router.route('/:id').get(userController.getDetail).put(userValidation.updateInfo, userController.updateInfo)

Router.route('/:id/avatar').put(upload.single('avatar'), userController.updateAvatar)

// no auth
Router.route('/reset-password').post(userController.resetPassword)

Router.route('/:id/change-password').put(userController.changePassword)

// NEW: Routes cho admin
// GET /users/admin/list?page=1&limit=20
Router.route('/admin/list').get(userController.getListUserForAdmin)

// NEW: Routes cho staff
// GET /users/staff/list?page=1&limit=20
Router.route('/staff/list').get(userController.getListUserForStaff)

// DELETE /users/:id/soft-delete
Router.route('/:id/soft-delete').delete(userController.softDeleteUser)

// NEW: GET /users/:id/events/three-months
Router.route('/:id/events/three-months').get(userController.getUserEventsForThreeMonths)

export const userRoute = Router
