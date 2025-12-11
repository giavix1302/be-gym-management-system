/* eslint-disable indent */
import { sanitize, updateImages } from '~/utils/utils'
import { trainerModel } from '../model/trainer.model'
import { trainerStatisticsModel } from '../model/trainerStatistics.model'
import { userModel } from '~/modules/user/model/user.model'
import { bookingModel } from '~/modules/booking/model/booking.model' // Import booking model
import { deleteImageByUrl } from '~/config/cloudinary.config'
import { STATUS_TYPE } from '~/utils/constants'

const createNew = async (req) => {
  try {
    const imageFiles = req.files || [] // luôn là array
    const physiqueImages = imageFiles.map((file) => file.path) // lấy ra mảng path

    const dataToCreate = {
      ...req.body,
      userId: req.body.userId,
      physiqueImages, // mảng link cloudinary
    }

    // check userId - neu có sang bước tiếp theo - khong có thì thông bao loi
    const existingUser = await userModel.getDetailById(dataToCreate.userId)
    if (!existingUser) return { success: false, message: 'User not found' }
    // data to create

    // create
    const createdTrainer = await trainerModel.createNew(dataToCreate)
    const getNewTrainer = await trainerModel.getDetailById(createdTrainer.insertedId)

    // return
    return {
      success: true,
      message: 'trainer info created successfully',
      trainer: {
        ...sanitize(getNewTrainer),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailByUserId = async (userId) => {
  try {
    const existingUser = await userModel.getDetailById(userId)
    if (!existingUser) return { success: false, message: 'User not found' }

    // check trainer
    const existingTrainer = await trainerModel.getDetailByUserId(userId)
    console.log('🚀 ~ getDetailByUserId ~ existingTrainer:', existingTrainer)
    if (!existingTrainer) return { success: false, message: 'Trainer information not updated.' }

    return {
      success: true,
      message: 'Trainer info got successfully',
      trainer: {
        ...sanitize(existingTrainer),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getListTrainerForUser = async () => {
  try {
    // check trainer
    const listTrainerInfo = await trainerModel.getListTrainerForUser()
    console.log('🚀 ~ getListTrainerForUser ~ listTrainerInfo:', listTrainerInfo)

    return {
      success: true,
      message: 'List Trainer info got successfully',
      listTrainerInfo,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getListTrainerForAdmin = async () => {
  try {
    // check trainer
    const listTrainerInfo = await trainerModel.getListTrainerForAdmin()
    console.log('🚀 ~ getListTrainerForUser ~ listTrainerInfo:', listTrainerInfo)

    return {
      success: true,
      message: 'List Trainer info got successfully',
      listTrainerInfo,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateIsApproved = async (trainerId, data) => {
  try {
    const dataToUpdate = {
      isApproved: data.isApproved,
      approvedAt: data.isApproved ? new Date().toISOString() : '',
    }
    // check trainer
    const trainerInfo = await trainerModel.updateInfo(trainerId, dataToUpdate)

    if (trainerInfo) await userModel.updateInfo(trainerInfo.userId, { status: STATUS_TYPE.ACTIVE })

    return {
      success: true,
      message: 'Trainer updated successfully',
      trainerInfo,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (userId, req) => {
  try {
    const body = req.body || {}

    // Tách physiqueImages (links cũ muốn giữ) và các field khác
    const { physiqueImages: physiqueImagesKeep, ...rest } = body

    // File upload mới từ form-data (tên field: physiqueImagesNew)
    const imageFiles = req.files || []
    const physiqueImagesNew = imageFiles.map((file) => file.path)

    console.log('🚀 ~ updateInfo ~ physiqueImagesKeep:', physiqueImagesKeep)
    console.log('🚀 ~ updateInfo ~ physiqueImagesNew:', physiqueImagesNew)

    // Kiểm tra existing trainer
    const existingTrainer = await trainerModel.getDetailByUserId(userId)

    if (!existingTrainer) {
      // Tạo mới nếu chưa có trainer info
      const dataToCreate = {
        ...rest,
        userId,
        physiqueImages: physiqueImagesNew, // Chỉ có ảnh mới
      }

      const result = await trainerModel.createNew(dataToCreate)
      const getNewTrainer = await trainerModel.getDetailById(result.insertedId)

      return {
        success: true,
        message: 'trainer info created successfully',
        trainer: {
          ...sanitize(getNewTrainer),
        },
      }
    }

    // Lấy thông tin hiện tại
    const { physiqueImages: physiqueImagesInDatabase, _id: trainerId } = existingTrainer

    // Chuẩn hóa dữ liệu đầu vào
    const physiqueImagesHold = Array.isArray(physiqueImagesKeep)
      ? physiqueImagesKeep
      : physiqueImagesKeep
      ? [physiqueImagesKeep]
      : []

    let updateData = {
      ...rest,
      updatedAt: Date.now(),
    }

    let imageUpdated = null

    // Kiểm tra xem có phải trường hợp "Giữ nguyên" không
    const isKeepAll =
      physiqueImagesHold.length === physiqueImagesInDatabase.length &&
      physiqueImagesHold.every((img) => physiqueImagesInDatabase.includes(img)) &&
      physiqueImagesNew.length === 0

    if (isKeepAll) {
      /**
       * CASE: Giữ nguyên - physiqueImagesHold giống hết physiqueImagesInDatabase
       * Không cập nhật field physiqueImages để tránh trigger không cần thiết
       */
      console.log('📸 Keep all current images - no changes needed')
    } else {
      /**
       * CASE: Có thay đổi về ảnh - sử dụng helper function updateImages
       * - physiqueImagesHold: ảnh cũ muốn giữ lại
       * - physiqueImagesNew: ảnh mới upload
       * - physiqueImagesInDatabase: ảnh hiện tại trong DB
       */
      imageUpdated = updateImages(
        physiqueImagesHold, // imageURL: ảnh cũ giữ lại
        physiqueImagesNew, // imageFile: ảnh mới
        physiqueImagesInDatabase // imageURLDatabase: ảnh trong DB
      )

      updateData.physiqueImages = imageUpdated.finalImage

      console.log('📸 Image update summary:')
      console.log(`  - Current in DB: ${physiqueImagesInDatabase.length} images`)
      console.log(`  - Keep from old: ${physiqueImagesHold.length} images`)
      console.log(`  - New uploaded: ${physiqueImagesNew.length} images`)
      console.log(`  - Final result: ${imageUpdated.finalImage.length} images`)
      console.log(`  - To remove: ${imageUpdated.removeImage.length} images`)
    }

    // Cập nhật trainer info
    const result = await trainerModel.updateInfo(trainerId, updateData)
    console.log('🚀 ~ updateInfo ~ updateData:', updateData)

    // Xóa ảnh cũ trên Cloudinary nếu cần
    if (imageUpdated && imageUpdated.removeImage.length > 0) {
      console.log('🗑️ Deleting removed images from Cloudinary:', imageUpdated.removeImage)
      for (const img of imageUpdated.removeImage) {
        try {
          await deleteImageByUrl(img)
          console.log(`✅ Deleted: ${img}`)
        } catch (error) {
          console.error(`❌ Failed to delete: ${img}`, error)
        }
      }
    }

    // Lấy trainer info sau khi update để trả về
    const updatedTrainer = await trainerModel.getDetailById(trainerId)

    return {
      success: true,
      message: 'trainer info updated successfully',
      trainer: {
        ...sanitize(updatedTrainer),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Hàm mới để lấy danh sách booking completed của trainer
const getListBookingByTrainerId = async (userId, query) => {
  try {
    // Lấy page và limit từ query parameters
    const page = parseInt(query.page) || 1
    const limit = parseInt(query.limit) || 10

    // Validate page và limit
    if (page < 1) {
      return {
        success: false,
        message: 'Page must be greater than 0',
      }
    }

    if (limit < 1 || limit > 100) {
      return {
        success: false,
        message: 'Limit must be between 1 and 100',
      }
    }

    // Kiểm tra xem user có tồn tại không
    const existingUser = await userModel.getDetailById(userId)
    if (!existingUser) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Lấy thông tin trainer từ userId
    const trainer = await trainerModel.getDetailByUserId(userId)
    if (!trainer) {
      return {
        success: false,
        message: 'Trainer not found',
      }
    }

    // Lấy danh sách booking của trainer với phân trang
    const result = await trainerModel.getListBookingByTrainerId(trainer._id, page, limit)

    return {
      success: true,
      message: 'List booking retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    }
  } catch (error) {
    console.error('Error in getListBookingByTrainerId service:', error)
    throw new Error(error.message || 'Internal server error')
  }
}

// Hàm mới để lấy thống kê dashboard cho trainer
const getTrainerDashboardStatsByUserId = async (userId) => {
  try {
    // Kiểm tra xem user có tồn tại không
    const existingUser = await userModel.getDetailById(userId)
    if (!existingUser) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Kiểm tra xem user có phải trainer không
    const trainer = await trainerModel.getDetailByUserId(userId)
    if (!trainer) {
      return {
        success: false,
        message: 'Trainer not found',
      }
    }

    // Lấy thống kê dashboard
    const stats = await trainerModel.getTrainerDashboardStatsByUserId(userId)

    return {
      success: true,
      message: 'Dashboard stats retrieved successfully',
      stats,
    }
  } catch (error) {
    console.error('Error in getTrainerDashboardStatsByUserId service:', error)
    throw new Error(error.message || 'Internal server error')
  }
}

const getTrainerEventsForThreeMonths = async (userId, options = {}) => {
  try {
    // Kiểm tra xem user có tồn tại không
    const existingUser = await userModel.getDetailById(userId)
    if (!existingUser) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Kiểm tra xem user có phải trainer không
    const trainer = await trainerModel.getDetailByUserId(userId)
    if (!trainer) {
      return {
        success: false,
        message: 'Trainer not found',
      }
    }

    // Lấy events của trainer với options
    const events = await trainerModel.getTrainerEventsForThreeMonths(userId, options)

    return {
      success: true,
      message: 'Trainer events retrieved successfully',
      events,
    }
  } catch (error) {
    console.error('Error in getTrainerEventsForThreeMonths service:', error)
    throw new Error(error.message || 'Internal server error')
  }
}

// NEW: Statistics Functions
const getTotalTrainers = async () => {
  try {
    const result = await trainerStatisticsModel.getTotalTrainers()
    return {
      success: true,
      message: 'Total trainers retrieved successfully',
      data: result,
    }
  } catch (error) {
    console.error('🚀 ~ getTotalTrainers ~ error:', error)
    throw new Error(error)
  }
}

const getActiveTrainers = async () => {
  try {
    const result = await trainerStatisticsModel.getActiveTrainers()
    return {
      success: true,
      message: 'Active trainers retrieved successfully',
      data: result,
    }
  } catch (error) {
    console.error('🚀 ~ getActiveTrainers ~ error:', error)
    throw new Error(error)
  }
}

const getPendingTrainers = async () => {
  try {
    const result = await trainerStatisticsModel.getPendingTrainers()
    return {
      success: true,
      message: 'Pending trainers retrieved successfully',
      data: result,
    }
  } catch (error) {
    console.error('🚀 ~ getPendingTrainers ~ error:', error)
    throw new Error(error)
  }
}

const getTotalTrainerRevenue = async () => {
  try {
    const result = await trainerStatisticsModel.getTotalTrainerRevenue()
    return {
      success: true,
      message: 'Total trainer revenue retrieved successfully',
      data: result,
    }
  } catch (error) {
    console.error('🚀 ~ getTotalTrainerRevenue ~ error:', error)
    throw new Error(error)
  }
}

const getTrainerRevenueByTime = async (startDate, endDate, groupBy = 'month') => {
  try {
    const result = await trainerStatisticsModel.getTrainerRevenueByTime(startDate, endDate, groupBy)
    console.log('🚀 ~ getTrainerRevenueByTime ~ result:', result)
    return {
      success: true,
      message: 'Trainer revenue by time retrieved successfully',
      data: result,
    }
  } catch (error) {
    console.error('🚀 ~ getTrainerRevenueByTime ~ error:', error)
    throw new Error(error)
  }
}

const getTrainersBySpecialization = async () => {
  try {
    const result = await trainerStatisticsModel.getTrainersBySpecialization()
    return {
      success: true,
      message: 'Trainers by specialization retrieved successfully',
      data: result,
    }
  } catch (error) {
    console.error('🚀 ~ getTrainersBySpecialization ~ error:', error)
    throw new Error(error)
  }
}

const getTrainingSessionsByTime = async (startDate, endDate, groupBy = 'day') => {
  try {
    const result = await trainerStatisticsModel.getTrainingSessionsByTime(startDate, endDate, groupBy)
    return {
      success: true,
      message: 'Training sessions by time retrieved successfully',
      data: result,
    }
  } catch (error) {
    console.error('🚀 ~ getTrainingSessionsByTime ~ error:', error)
    throw new Error(error)
  }
}

const getTopTrainersByRevenue = async (limit = 10) => {
  try {
    const result = await trainerStatisticsModel.getTopTrainersByRevenue(limit)
    console.log('🚀 ~ getTopTrainersByRevenue ~ result:', result)
    return {
      success: true,
      message: 'Top trainers by revenue retrieved successfully',
      data: result,
    }
  } catch (error) {
    console.error('🚀 ~ getTopTrainersByRevenue ~ error:', error)
    throw new Error(error)
  }
}

// Thêm vào export
export const trainerService = {
  createNew,
  getDetailByUserId,
  getListTrainerForUser,
  getListTrainerForAdmin,
  updateInfo,
  updateIsApproved,
  getListBookingByTrainerId,
  getTrainerDashboardStatsByUserId,
  getTrainerEventsForThreeMonths,

  // Statistics Functions
  getTotalTrainers,
  getActiveTrainers,
  getPendingTrainers,
  getTotalTrainerRevenue,
  getTrainerRevenueByTime,
  getTrainersBySpecialization,
  getTrainingSessionsByTime,
  getTopTrainersByRevenue,
}
