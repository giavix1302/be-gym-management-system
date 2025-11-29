import express from 'express'
import { classController } from '../controller/class.controller'
import { classValidation } from '../validation/class.validation'
import { upload } from '~/config/cloudinary.config'
import { authMiddleware } from '~/middlewares/auth.middleware'

const Router = express.Router()

// Main routes
Router.route('/').post(upload.single('image'), classController.addClass).get(classController.getListClasses)

Router.route('/admin').get(classController.getListClassInfoForAdmin)

Router.route('/user').get(classController.getListClassInfoForUser)
Router.route('/user/:userId').get(classController.getMemberEnrolledClasses)

// Location-specific routes
Router.route('/location/:locationId').get(classController.getListClassByLocationId)

// Specific class routes
Router.route('/:id')
  .get(classController.getClassDetail)
  .put(upload.single('image'), classController.updateClass)
  .delete(classController.deleteClass)

// Filter routes
Router.route('/trainer/:id').get(classController.getListClassInfoForTrainer)

Router.route('/type/:type').get(classValidation.getClassesByType, classController.getClassesByType)

export const classRoute = Router
