import express from 'express'
import { upload } from '~/config/cloudinary.config'
import { paymentController } from '../controller/payment.controller'

const Router = express.Router()

Router.route('/vnpay/subscription/:id').post(paymentController.createPaymentVnpay)
Router.route('/vnpay-return').get(paymentController.vnpReturn)
Router.route('/vnpay/booking').post(paymentController.createPaymentBookingPtVnpay)
Router.route('/vnpay/class').post(paymentController.createPaymentClassVnpay)

// Routes mới
Router.route('/user/:userId').get(paymentController.getPaymentsByUserId) // Lấy payments theo userId
Router.route('/admin/all').get(paymentController.getAllPaymentsForAdmin) // Lấy tất cả payments cho admin

export const paymentRoute = Router
