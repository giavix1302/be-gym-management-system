import express from 'express'
import { authController } from '../controller/auth.controller.js'
import { authValidation } from '~/modules/auth/validation/auth.validation.js'

const Router = express.Router()

Router.route('/login').post(authController.login)

Router.route('/signup').post(authValidation.signup, authController.signup)

Router.route('/verify').post(authController.verify)

// Refresh token (xin access token mới)
Router.route('/refresh').post(authController.refreshToken)

// Logout (xóa refresh token)
Router.route('/logout').post(authController.logout)

Router.route('/forgot-password/sent-opt').post(authController.forgotPasswordSentOTP)
Router.route('/forgot-password/verify').post(authController.forgotPasswordVerifyOTP)

export const authRoute = Router
