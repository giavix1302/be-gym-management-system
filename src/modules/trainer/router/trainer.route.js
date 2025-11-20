import express from 'express'
import { upload } from '~/config/cloudinary.config'
import { trainerController } from '../controller/trainer.controller'
import { trainerValidation } from '../validation/trainer.validation'

const Router = express.Router()

// Existing routes
Router.route('/').post(upload.array('physiqueImages', 6), trainerController.createNew)

Router.route('/user').get(trainerController.getListTrainerForUser)

Router.route('/admin').get(trainerController.getListTrainerForAdmin)

Router.route('/:id')
  .get(trainerController.getDetailByUserId)
  .put(upload.array('physiqueImagesNew', 6), trainerController.updateInfo)

Router.route('/is-approved/:id').put(trainerController.updateIsApproved)

// Existing routes for bookings and dashboard
Router.route('/:id/bookings').get(trainerController.getListBookingByTrainerId)
Router.route('/:id/dashboard-stats').get(trainerController.getTrainerDashboardStatsByUserId)

// NEW: Route for getting trainer events in 3 months
Router.route('/:id/events').get(trainerController.getTrainerEventsForThreeMonths)

export const trainerRoute = Router
