import express from 'express'
import { locationController } from '../controller/location.controller'
import { upload } from '~/config/cloudinary.config'

const Router = express.Router()

Router.route('/')
  .post(upload.array('locationImgs', 6), locationController.createNew)
  .get(locationController.getListLocation)

Router.route('/admin').get(locationController.getListLocationForAdmin)

Router.route('/:id')
  .put(upload.array('locationImgs', 6), locationController.updateInfo) // support multiple images
  .delete(locationController.deleteLocation) // soft delete

export const locationRoute = Router
