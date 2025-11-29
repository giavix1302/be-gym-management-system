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

// Existing route for getting trainer events in 3 months
Router.route('/:id/events').get(trainerController.getTrainerEventsForThreeMonths)

// NEW: Statistics Routes
// Overview Statistics - 4 Cards
Router.route('/statistics/total-trainers').get(trainerController.getTotalTrainers)
Router.route('/statistics/active-trainers').get(trainerController.getActiveTrainers)
Router.route('/statistics/pending-trainers').get(trainerController.getPendingTrainers)
Router.route('/statistics/total-revenue').get(trainerController.getTotalTrainerRevenue)

// Chart Statistics - 4 Charts
Router.route('/statistics/revenue-by-time').get(trainerController.getTrainerRevenueByTime)
Router.route('/statistics/trainers-by-specialization').get(trainerController.getTrainersBySpecialization)
Router.route('/statistics/sessions-by-time').get(trainerController.getTrainingSessionsByTime)
Router.route('/statistics/top-trainers-by-revenue').get(trainerController.getTopTrainersByRevenue)

export const trainerRoute = Router
