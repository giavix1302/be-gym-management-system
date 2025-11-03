import express from 'express'
import { equipmentController } from '../controller/equipment.controller'
import { upload } from '~/config/cloudinary.config'
import { authMiddleware } from '~/middlewares/auth.middleware'

const Router = express.Router()

// Base route: /api/equipments
Router.route('/')
  // Create new equipment (with image upload support)
  .post(upload.single('image'), equipmentController.createEquipment)
  // Get all equipments
  .get(equipmentController.getAllEquipments)

// Route for searching equipments: /api/equipments/search?q=searchTerm
Router.route('/search').get(equipmentController.searchEquipments)

// Route for equipments by status: /api/equipments/status/:status
Router.route('/status/:status').get(equipmentController.getEquipmentsByStatus)

// Route for equipments by muscle category: /api/equipments/muscle/:muscleCategory
Router.route('/muscle/:muscleCategory').get(equipmentController.getEquipmentsByMuscleCategory)

// Route for location's equipments: /api/equipments/location/:locationId
Router.route('/location/:locationId').get(equipmentController.getEquipmentsByLocationId)

// Route for specific equipment by ID: /api/equipments/:id
Router.route('/:id')
  // Get equipment by ID
  .get(equipmentController.getEquipmentById)
  // Update equipment by ID (with image upload support)
  .put(upload.single('image'), equipmentController.updateEquipment)

// Route for updating equipment status: /api/equipments/:id/status
Router.route('/:id/status').patch(equipmentController.updateEquipmentStatus)

// Route for soft delete: /api/equipments/:id/soft-delete
Router.route('/:id/soft-delete').patch(equipmentController.softDeleteEquipment)

// Route for maintenance history: /api/equipments/:id/maintenance
Router.route('/:id/maintenance')
  // Get maintenance history
  .get(equipmentController.getMaintenanceHistory)
  // Add new maintenance record
  .post(equipmentController.addMaintenanceRecord)

// Route for specific maintenance record: /api/equipments/:id/maintenance/:maintenanceIndex
Router.route('/:id/maintenance/:maintenanceIndex')
  // Update specific maintenance record
  .put(equipmentController.updateMaintenanceRecord)
  // Delete specific maintenance record
  .delete(equipmentController.deleteMaintenanceRecord)

export const equipmentRoute = Router
