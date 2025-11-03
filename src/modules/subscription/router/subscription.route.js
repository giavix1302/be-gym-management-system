import express from 'express'
import { upload } from '~/config/cloudinary.config'
import { subscriptionController } from '../controller/subscription.controller'
import { subscriptionValidation } from '../validation/subscription.validation'

const Router = express.Router()

Router.route('/')
  // nhận userId, membershipId, paymentMethod
  .post(subscriptionValidation.subscribeMembership, subscriptionController.subscribeMembership)
  .get((req, res) => {
    res.json({ message: 'Create QR endpoint' })
  })

Router.route('/staff').post(subscriptionController.subscribeMembershipForStaff)

Router.route('/:id').get(subscriptionController.getSubDetailByUserId).delete(subscriptionController.deleteSubscription)

export const subscriptionRoute = Router
