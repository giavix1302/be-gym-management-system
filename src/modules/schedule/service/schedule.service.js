import { trainerModel } from '~/modules/trainer/model/trainer.model'
import { scheduleModel } from '../model/schedule.model'
import { sanitize } from '~/utils/utils'

const createNew = async (req) => {
  try {
    const { trainerId, startTime, endTime } = req.body

    const existingTrainer = await trainerModel.getDetailById(trainerId)
    if (!existingTrainer) return { success: false, message: 'trainer not fould' }

    // validate startTime < endTime
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, message: 'Invalid startTime or endTime format' }
    }
    if (start >= end) {
      return { success: false, message: 'startTime must be before endTime' }
    }

    // check conflict
    const conflict = await scheduleModel.checkConflict(trainerId, startTime, endTime)
    console.log('🚀 ~ createNew ~ conflict:', conflict)
    if (conflict) {
      return { success: false, message: 'Schedule conflict detected' }
    }

    const dataToCreate = {
      trainerId,
      startTime,
      endTime,
    }

    const newSchedule = await scheduleModel.createNew(dataToCreate)

    const getNewSchedule = await scheduleModel.getDetailById(newSchedule.insertedId)

    const listSchedule = await scheduleModel.getListScheduleByTrainerId(trainerId)

    return {
      success: true,
      message: 'schedule created successfully',
      newSchedule: getNewSchedule,
      listSchedule,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getListScheduleByTrainerId = async (trainerId) => {
  try {
    const existingTrainer = await trainerModel.getDetailById(trainerId)
    if (!existingTrainer) {
      return { success: false, message: 'trainer not found' }
    }

    const listSchedule = await scheduleModel.getListScheduleByTrainerId(trainerId)

    return {
      success: true,
      message: 'List schedule got successfully',
      trainerId,
      listSchedule,
    }
  } catch (error) {
    throw new Error(error)
  }
}

// unable
const updateInfo = async (scheduleId, data) => {
  try {
    // check existing user
    const existingSchedule = await scheduleModel.getDetailById(scheduleId)
    if (existingSchedule === null) {
      return {
        success: false,
        message: 'schedule not found',
      }
    }
    const updateData = {
      ...data,
      updatedAt: Date.now(),
    }
    const result = await scheduleModel.updateInfo(scheduleId, updateData)

    // update s
    return {
      success: true,
      message: 'schedule updated successfully',
      schedule: {
        ...sanitize(result),
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteSchedule = async (scheduleId) => {
  try {
    // tim schedule có tồn tài không
    const existingSchedule = await scheduleModel.getDetailById(scheduleId)
    if (!existingSchedule) return { success: false, message: 'schedule not fould' }
    // xóa schedule
    const result = await scheduleModel.deleteSchedule(scheduleId)
    return {
      success: true,
      message: 'schedule deleted successfully',
      result,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteListSchedule = async (listScheduleId) => {
  try {
    for (const scheduleId of listScheduleId) {
      // tìm schedule có tồn tại không
      const existingSchedule = await scheduleModel.getDetailById(scheduleId)
      if (!existingSchedule) {
        return { success: false, message: `Schedule not found: ${scheduleId}` }
      }

      // xoá schedule
      await scheduleModel.deleteSchedule(scheduleId)
    }

    return {
      success: true,
      message: 'All schedules deleted successfully',
    }
  } catch (error) {
    throw new Error(error)
  }
}
export const scheduleService = {
  createNew,
  getListScheduleByTrainerId,
  updateInfo,
  deleteSchedule,
  deleteListSchedule,
}
