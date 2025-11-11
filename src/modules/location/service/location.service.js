import { locationModel } from '../model/location.model'
import { sanitize, updateImages } from '~/utils/utils'
import { deleteImageByUrl } from '~/config/cloudinary.config'

const createNew = async (req) => {
  try {
    const imageFiles = req.files || [] // luôn là array
    const images = imageFiles.map((file) => file.path) // lấy ra mảng path

    // parse address vì form-data chỉ gửi string
    const address = JSON.parse(req.body.address)

    const newData = {
      name: req.body.name,
      phone: req.body.phone,
      address,
      images, // mảng link cloudinary
    }

    console.log('🚀 ~ createNew ~ newData:', newData)
    const createdLocation = await locationModel.createNew(newData)
    const getNewLocation = await locationModel.getDetailById(createdLocation.insertedId)

    return {
      success: true,
      message: 'Location created successfully',
      location: {
        ...sanitize(getNewLocation),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getListLocation = async () => {
  try {
    const listLocation = await locationModel.getListLocation()
    console.log('🚀 ~ getListLocation ~ listLocation:', listLocation)
    return {
      success: true,
      message: 'Locations retrieved successfully',
      locations: listLocation.map((location) => sanitize(location)),
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getListLocationForAdmin = async (page = 1, limit = 10) => {
  try {
    const result = await locationModel.getListLocationForAdmin(page, limit)
    console.log('🚀 ~ getListLocationForAdmin ~ result:', result)
    return {
      success: true,
      message: 'Locations for admin retrieved successfully',
      locations: result.locations.map((location) => sanitize(location)),
      pagination: result.pagination,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (locationId, req) => {
  try {
    // Check existing location
    const existingLocation = await locationModel.getDetailById(locationId)
    if (!existingLocation) {
      return {
        success: false,
        message: 'Location not found',
      }
    }

    const body = req.body || {}

    // Tách images (links cũ muốn giữ) và các field khác
    const { images: imagesKeep, address, ...rest } = body

    // File upload mới từ form-data
    const imageFiles = req.files || []
    const imagesNew = imageFiles.map((file) => file.path)

    console.log('🚀 ~ updateInfo ~ imagesKeep:', imagesKeep)
    console.log('🚀 ~ updateInfo ~ imagesNew:', imagesNew)

    // Parse address nếu có và là string
    let parsedAddress = address
    if (address && typeof address === 'string') {
      try {
        parsedAddress = JSON.parse(address)
      } catch (error) {
        console.error('Error parsing address:', error)
        parsedAddress = address
      }
    }

    // Lấy thông tin hiện tại
    const { images: imagesInDatabase } = existingLocation

    // Chuẩn hóa dữ liệu đầu vào
    const imagesHold = Array.isArray(imagesKeep) ? imagesKeep : imagesKeep ? [imagesKeep] : []

    let updateData = {
      ...rest,
      updatedAt: Date.now(),
    }

    // Thêm address vào updateData nếu có
    if (parsedAddress) {
      updateData.address = parsedAddress
    }

    let imageUpdated = null

    // Kiểm tra xem có phải trường hợp "Giữ nguyên" không
    const isKeepAll =
      imagesHold.length === imagesInDatabase.length &&
      imagesHold.every((img) => imagesInDatabase.includes(img)) &&
      imagesNew.length === 0

    if (isKeepAll) {
      /**
       * CASE: Giữ nguyên - imagesHold giống hết imagesInDatabase
       * Không cập nhật field images để tránh trigger không cần thiết
       */
      console.log('📸 Keep all current images - no changes needed')
    } else {
      /**
       * CASE: Có thay đổi về ảnh - sử dụng helper function updateImages
       * - imagesHold: ảnh cũ muốn giữ lại
       * - imagesNew: ảnh mới upload
       * - imagesInDatabase: ảnh hiện tại trong DB
       */
      imageUpdated = updateImages(
        imagesHold, // imageURL: ảnh cũ giữ lại
        imagesNew, // imageFile: ảnh mới
        imagesInDatabase // imageURLDatabase: ảnh trong DB
      )

      updateData.images = imageUpdated.finalImage

      console.log('📸 Image update summary:')
      console.log(`  - Current in DB: ${imagesInDatabase.length} images`)
      console.log(`  - Keep from old: ${imagesHold.length} images`)
      console.log(`  - New uploaded: ${imagesNew.length} images`)
      console.log(`  - Final result: ${imageUpdated.finalImage.length} images`)
      console.log(`  - To remove: ${imageUpdated.removeImage.length} images`)
    }

    // Cập nhật location info
    const result = await locationModel.updateInfo(locationId, updateData)
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

    // Lấy location info sau khi update để trả về
    const updatedLocation = await locationModel.getDetailById(locationId)

    return {
      success: true,
      message: 'Location updated successfully',
      location: {
        ...sanitize(updatedLocation),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteLocation = async (locationId) => {
  try {
    // Check if location exists
    const existingLocation = await locationModel.getDetailById(locationId)
    if (!existingLocation) {
      return {
        success: false,
        message: 'Location not found',
      }
    }

    // Soft delete location
    const result = await locationModel.deleteLocation(locationId)

    if (result > 0) {
      return {
        success: true,
        message: 'Location deleted successfully',
        result,
      }
    } else {
      return {
        success: false,
        message: 'Failed to delete location',
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const locationService = {
  createNew,
  getListLocation,
  getListLocationForAdmin,
  updateInfo,
  deleteLocation,
}
