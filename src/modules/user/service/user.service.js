import { userModel } from '~/modules/user/model/user.model.js'
import { sanitize } from '~/utils/utils'

const createNew = async (reqBody) => {
  try {
    const createdUser = await userModel.createNew(reqBody)
    const getNewUser = await userModel.getDetail(createdUser.insertedId)
    return getNewUser
  } catch (error) {
    throw new Error(error)
  }
}

const getDetail = async (userId) => {
  try {
    const user = await userModel.getDetail(userId)
    return user
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (userId, data) => {
  try {
    // check existing user
    const existingUser = await userModel.getDetailById(userId)
    console.log('🚀 ~ update ~ existingUser:', existingUser)
    if (existingUser === null) {
      return {
        success: false,
        message: 'User not found',
      }
    }
    const updateData = {
      ...data,
      updatedAt: Date.now(),
    }
    const result = await userModel.updateInfo(userId, updateData)
    console.log('🚀 ~ updateInfo ~ result:', result)

    // update user
    return {
      success: true,
      message: 'User updated successfully',
      user: {
        ...sanitize(result),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Lấy danh sách user cho staff
const getListUserForStaff = async (page = 1, limit = 20) => {
  try {
    const result = await userModel.getListUserForStaff(page, limit)

    // Sanitize password khỏi kết quả trả về
    const sanitizedUsers = result.users.map((user) => ({
      ...user,
      password: undefined, // Loại bỏ password khỏi response
      // Có thể sanitize thêm các field nhạy cảm khác nếu cần
    }))

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: sanitizedUsers,
        pagination: result.pagination,
      },
    }
  } catch (error) {
    console.error('🚀 ~ getListUserForStaff ~ error:', error)
    throw new Error(error)
  }
}

// NEW: Xóa mềm user
const softDeleteUser = async (userId) => {
  try {
    const result = await userModel.softDeleteUser(userId)

    if (result.success && result.user) {
      // Sanitize password khỏi kết quả trả về
      result.user.password = undefined
    }

    return result
  } catch (error) {
    console.error('🚀 ~ softDeleteUser ~ error:', error)
    throw new Error(error)
  }
}

export const userService = {
  createNew,
  getDetail,
  updateInfo,
  getListUserForStaff, // NEW
  softDeleteUser, // NEW
}
