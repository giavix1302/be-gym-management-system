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

// NEW: Statistics Routes
// Overview Statistics - 4 Cards
Router.route('/statistics/total-members').get(userController.getTotalMembers)
Router.route('/statistics/active-members').get(userController.getActiveMembers)
Router.route('/statistics/new-members-3days').get(userController.getNewMembers3Days)
Router.route('/statistics/total-revenue').get(userController.getTotalRevenueFromMembers)

// Chart Statistics - 4 Charts
Router.route('/statistics/new-members-by-time').get(userController.getNewMembersByTime)
Router.route('/statistics/members-by-gender').get(userController.getMembersByGender)
Router.route('/statistics/checkin-trend').get(userController.getCheckinTrend)
Router.route('/statistics/members-by-age').get(userController.getMembersByAge)

export const userRoute = Router
