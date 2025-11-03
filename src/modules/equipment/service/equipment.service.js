import { equipmentModel } from '../model/equipment.model'
import { EQUIPMENT_STATUS } from '~/utils/constants.js'
import { sanitize } from '~/utils/utils'

const createEquipment = async (req) => {
  try {
    // Handle image upload
    const image = req.file
    const { muscleCategories, ...rest } = req.body

    const equipmentToAdd = {
      ...rest,
      // Parse muscleCategories if it comes as string from form data
      muscleCategories: typeof muscleCategories === 'string' ? JSON.parse(muscleCategories) : muscleCategories || [],
      // Set image URL from uploaded file
      image: image ? image.path : '',
      // Ensure locationId is included
      locationId: rest.locationId,
    }

    console.log('🚀 ~ createEquipment ~ equipmentToAdd:', equipmentToAdd)

    // Create equipment
    const result = await equipmentModel.createNew(equipmentToAdd)

    // Get the newly created equipment
    const equipment = await equipmentModel.getDetailById(result.insertedId)

    return {
      success: true,
      message: 'Equipment created successfully',
      equipment: sanitize(equipment),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getEquipmentById = async (equipmentId) => {
  try {
    const equipment = await equipmentModel.getDetailById(equipmentId)
    console.log('🚀 ~ getEquipmentById ~ equipment:', equipment)

    if (equipment === null) {
      return {
        success: false,
        message: 'Equipment not found',
      }
    }

    return {
      success: true,
      message: 'Equipment retrieved successfully',
      equipment: sanitize(equipment),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getEquipmentsByLocationId = async (locationId) => {
  try {
    const equipments = await equipmentModel.getEquipmentsByLocationId(locationId)
    console.log('🚀 ~ getEquipmentsByLocationId ~ equipments count:', equipments.length)

    return {
      success: true,
      message: 'Location equipments retrieved successfully',
      equipments: equipments.map((equipment) => sanitize(equipment)),
      total: equipments.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getAllEquipments = async () => {
  try {
    const equipments = await equipmentModel.getAllEquipments()
    console.log('🚀 ~ getAllEquipments ~ equipments count:', equipments.length)

    return {
      success: true,
      message: 'All equipments retrieved successfully',
      equipments: equipments.map((equipment) => sanitize(equipment)),
      total: equipments.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getEquipmentsByStatus = async (status) => {
  try {
    const equipments = await equipmentModel.getEquipmentsByStatus(status)
    console.log('🚀 ~ getEquipmentsByStatus ~ equipments:', equipments.length)

    return {
      success: true,
      message: `Equipments with status '${status}' retrieved successfully`,
      equipments: equipments.map((equipment) => sanitize(equipment)),
      total: equipments.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateEquipment = async (req) => {
  try {
    const equipmentId = req.params.id
    const image = req.file
    const { muscleCategories, ...rest } = req.body

    // Check if equipment exists
    const isEquipmentExist = await equipmentModel.getDetailById(equipmentId)
    console.log('🚀 ~ updateEquipment ~ isEquipmentExist:', isEquipmentExist)
    if (isEquipmentExist === null) {
      return { success: false, message: 'Equipment not found' }
    }

    const updateData = {
      ...rest,
      // Handle image update
      ...(image && { image: image.path }),
      // Handle muscleCategories update
      ...(muscleCategories && {
        muscleCategories: typeof muscleCategories === 'string' ? JSON.parse(muscleCategories) : muscleCategories,
      }),
      // Convert locationId to ensure it's properly formatted
      ...(rest.locationId && { locationId: rest.locationId }),
      updatedAt: Date.now(),
    }

    console.log('🚀 ~ updateEquipment ~ updateData:', updateData)

    const result = await equipmentModel.updateInfo(equipmentId, updateData)
    console.log('🚀 ~ updateEquipment ~ result:', result)

    if (result === null) {
      return {
        success: false,
        message: 'Failed to update equipment',
      }
    }

    return {
      success: true,
      message: 'Equipment updated successfully',
      equipment: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateEquipmentStatus = async (equipmentId, status) => {
  try {
    // Check if equipment exists
    const isEquipmentExist = await equipmentModel.getDetailById(equipmentId)
    if (isEquipmentExist === null) {
      return { success: false, message: 'Equipment not found' }
    }

    // Validate status
    const validStatuses = Object.values(EQUIPMENT_STATUS)
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`,
      }
    }

    const result = await equipmentModel.updateStatus(equipmentId, status)
    console.log('🚀 ~ updateEquipmentStatus ~ result:', result)

    if (result === null) {
      return {
        success: false,
        message: 'Failed to update equipment status',
      }
    }

    return {
      success: true,
      message: 'Equipment status updated successfully',
      equipment: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const addMaintenanceRecord = async (equipmentId, maintenanceData) => {
  try {
    // Check if equipment exists
    const isEquipmentExist = await equipmentModel.getDetailById(equipmentId)
    if (isEquipmentExist === null) {
      return { success: false, message: 'Equipment not found' }
    }

    const maintenanceRecord = {
      date: maintenanceData.date,
      details: maintenanceData.details.trim(),
      technician: maintenanceData.technician.trim(),
      cost: maintenanceData.cost || 0,
    }

    const result = await equipmentModel.addMaintenanceRecord(equipmentId, maintenanceRecord)
    console.log('🚀 ~ addMaintenanceRecord ~ result:', result)

    if (result === null) {
      return {
        success: false,
        message: 'Failed to add maintenance record',
      }
    }

    return {
      success: true,
      message: 'Maintenance record added successfully',
      equipment: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateMaintenanceRecord = async (equipmentId, maintenanceIndex, updateData) => {
  try {
    // Check if equipment exists
    const equipment = await equipmentModel.getDetailById(equipmentId)
    if (equipment === null) {
      return { success: false, message: 'Equipment not found' }
    }

    // Check if maintenance record index is valid
    if (
      !equipment.maintenanceHistory ||
      maintenanceIndex >= equipment.maintenanceHistory.length ||
      maintenanceIndex < 0
    ) {
      return { success: false, message: 'Invalid maintenance record index' }
    }

    const updatedRecord = {}
    if (updateData.date) updatedRecord.date = updateData.date
    if (updateData.details) updatedRecord.details = updateData.details.trim()
    if (updateData.technician) updatedRecord.technician = updateData.technician.trim()
    if (updateData.cost !== undefined) updatedRecord.cost = updateData.cost

    const result = await equipmentModel.updateMaintenanceRecord(equipmentId, maintenanceIndex, updatedRecord)
    console.log('🚀 ~ updateMaintenanceRecord ~ result:', result)

    if (result === null) {
      return {
        success: false,
        message: 'Failed to update maintenance record',
      }
    }

    return {
      success: true,
      message: 'Maintenance record updated successfully',
      equipment: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteMaintenanceRecord = async (equipmentId, maintenanceIndex) => {
  try {
    // Check if equipment exists
    const equipment = await equipmentModel.getDetailById(equipmentId)
    if (equipment === null) {
      return { success: false, message: 'Equipment not found' }
    }

    // Check if maintenance record index is valid
    if (
      !equipment.maintenanceHistory ||
      maintenanceIndex >= equipment.maintenanceHistory.length ||
      maintenanceIndex < 0
    ) {
      return { success: false, message: 'Invalid maintenance record index' }
    }

    const result = await equipmentModel.deleteMaintenanceRecord(equipmentId, maintenanceIndex)
    console.log('🚀 ~ deleteMaintenanceRecord ~ result:', result)

    if (result === null) {
      return {
        success: false,
        message: 'Failed to delete maintenance record',
      }
    }

    return {
      success: true,
      message: 'Maintenance record deleted successfully',
      equipment: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const softDeleteEquipment = async (equipmentId) => {
  try {
    // Check if equipment exists
    const isEquipmentExist = await equipmentModel.getDetailById(equipmentId)
    console.log('🚀 ~ softDeleteEquipment ~ isEquipmentExist:', isEquipmentExist)
    if (isEquipmentExist === null) {
      return { success: false, message: 'Equipment not found' }
    }

    const result = await equipmentModel.softDeleteEquipment(equipmentId)
    console.log('🚀 ~ softDeleteEquipment ~ result:', result)

    if (result === null) {
      return {
        success: false,
        message: 'Failed to soft delete equipment',
      }
    }

    return {
      success: true,
      message: 'Equipment soft deleted successfully',
      equipment: sanitize(result),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const searchEquipments = async (searchTerm) => {
  try {
    const equipments = await equipmentModel.searchEquipments(searchTerm)
    console.log('🚀 ~ searchEquipments ~ equipments:', equipments.length)

    return {
      success: true,
      message: 'Equipment search completed successfully',
      equipments: equipments.map((equipment) => sanitize(equipment)),
      total: equipments.length,
      searchTerm,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getMaintenanceHistory = async (equipmentId) => {
  try {
    const equipment = await equipmentModel.getDetailById(equipmentId)
    if (equipment === null) {
      return { success: false, message: 'Equipment not found' }
    }

    return {
      success: true,
      message: 'Maintenance history retrieved successfully',
      maintenanceHistory: equipment.maintenanceHistory || [],
      equipmentName: equipment.name,
      equipmentBrand: equipment.brand,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getEquipmentsByMuscleCategory = async (muscleCategory) => {
  try {
    const equipments = await equipmentModel.getEquipmentsByMuscleCategory(muscleCategory)
    console.log('🚀 ~ getEquipmentsByMuscleCategory ~ equipments:', equipments.length)

    return {
      success: true,
      message: `Equipments for muscle category '${muscleCategory}' retrieved successfully`,
      equipments: equipments.map((equipment) => sanitize(equipment)),
      total: equipments.length,
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const equipmentService = {
  createEquipment,
  getEquipmentById,
  getEquipmentsByLocationId,
  getAllEquipments,
  getEquipmentsByStatus,
  updateEquipment,
  updateEquipmentStatus,
  addMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  softDeleteEquipment,
  searchEquipments,
  getMaintenanceHistory,
  getEquipmentsByMuscleCategory,
}
