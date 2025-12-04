import { generateClassSessions, getDayName, isValidDateRange } from '~/utils/utils'
import { classModel } from '../model/class.model'
import { classSessionModel } from '~/modules/classSession/model/classSession.model'

const addClass = async (req) => {
  try {
    // add location id
    const image = req.file

    const classToAdd = {
      ...req.body,
      image: image ? image.path : '',
      recurrence: JSON.parse(req.body.recurrence),
      trainers: JSON.parse(req.body.trainers),
    }

    console.log('🚀 ~ addClass ~ classToAdd:', classToAdd)

    // Check startDate > endDate
    if (!isValidDateRange(classToAdd.startDate, classToAdd.endDate))
      return { success: false, message: 'Start date must be earlier than end date.' }

    // check conflict room and time
    const conflictRoom = await classModel.checkRoomScheduleConflict(
      classToAdd.startDate,
      classToAdd.endDate,
      classToAdd.recurrence
    )
    if (conflictRoom.hasConflict) {
      let messageError = `Found ${conflictRoom?.conflictCount} conflict(s)`
      conflictRoom.conflicts.forEach((conflict) => {
        messageError += ` Conflict in ${conflict.roomName} on ${getDayName(conflict.dayOfWeek)}`
      })

      return { success: false, message: messageError }
    }
    // check conflict schedule PT
    const conflictPT = await classModel.checkPTScheduleConflict(
      classToAdd.trainers,
      classToAdd.startDate,
      classToAdd.endDate,
      classToAdd.recurrence
    )
    if (conflictPT.hasConflict) {
      return { success: false, message: `${conflictPT.trainersWithConflicts} trainer(s) have conflicts` }
      // console.log()
      // console.log(`Total conflicts: ${result.totalConflictCount}`)

      // // Check specific trainer
      // Object.values(result.trainerDetails).forEach((trainer) => {
      //   console.log(`${trainer.name} has ${trainer.conflictCount} conflicts`)
      // })
    }

    // Create class
    const result = await classModel.createNew(classToAdd)
    const classId = result.insertedId

    // Generate class sessions based on recurrence
    const sessions = generateClassSessions(
      classId,
      classToAdd.startDate,
      classToAdd.endDate,
      classToAdd.recurrence,
      classToAdd.trainers,
      classToAdd.name
    )

    // Create all class sessions
    const sessionPromises = sessions.map((session) => classSessionModel.createNew(session))
    await Promise.all(sessionPromises)

    // Get the newly created class with details
    const classDetail = await classModel.getDetailById(classId)

    return {
      success: true,
      message: `Class created successfully with ${sessions.length} session(s)`,
      class: classDetail,
      sessionsCreated: sessions.length,
    }
  } catch (error) {
    console.error('Error in addClass service:', error)
    throw new Error(error)
  }
}

const getListClasses = async () => {
  try {
    const list = await classModel.getList()

    return {
      success: true,
      message: 'Get list classes successfully',
      classes: list,
      total: list.length,
    }
  } catch (error) {
    console.error('Error in getListClasses service:', error)
    throw new Error(error)
  }
}

const getListClassInfoForAdmin = async () => {
  try {
    const list = await classModel.getListClassInfoForAdmin()

    return {
      success: true,
      message: 'Get list classes successfully',
      classes: list,
      total: list.length,
    }
  } catch (error) {
    console.error('Error in getListClasses service:', error)
    throw new Error(error)
  }
}

const getListClassInfoForUser = async () => {
  try {
    const list = await classModel.getListClassInfoForUser()
    console.log('🚀 ~ getListClassInfoForUser ~ list:', list)

    return {
      success: true,
      message: 'Get list classes successfully',
      classes: list,
    }
  } catch (error) {
    console.error('Error in getListClasses service:', error)
    throw new Error(error)
  }
}

const getListClassInfoForTrainer = async (trainerId) => {
  try {
    const list = await classModel.getListClassInfoForTrainer(trainerId)

    return {
      success: true,
      message: 'Get list classes successfully',
      classes: list,
    }
  } catch (error) {
    console.error('Error in getListClasses service:', error)
    throw new Error(error)
  }
}

const getClassDetail = async (classId) => {
  try {
    const classDetail = await classModel.getDetailById(classId)

    if (!classDetail) {
      return {
        success: false,
        message: 'Class not found',
      }
    }

    return {
      success: true,
      message: 'Get class detail successfully',
      class: classDetail,
    }
  } catch (error) {
    console.error('Error in getClassDetail service:', error)
    throw new Error(error)
  }
}

const updateClass = async (req) => {
  try {
    const classId = req.params.id
    const { name, description, capacity, trainers } = req.body

    const image = req.file

    const updateData = {
      name,
      description,
      capacity,
      ...(image && { image: image.path }),
      ...(trainers && { trainers: JSON.parse(trainers) }),
      updatedAt: Date.now(),
    }

    console.log('🚀 ~ updateClass ~ updateData:', updateData)

    const updatedClass = await classModel.updateInfo(classId, updateData)

    if (updatedClass === null) {
      return {
        success: false,
        message: 'Class does not exist.',
      }
    }

    return {
      success: true,
      message: 'Class updated successfully',
      class: updatedClass,
    }
  } catch (error) {
    console.error('Error in updateClass service:', error)
    throw new Error(error)
  }
}

const deleteClass = async (classId) => {
  try {
    const result = await classModel.deleteClass(classId)

    return {
      success: result === 1,
      message: result === 1 ? 'Class deleted successfully!' : 'Delete failed!',
    }
  } catch (error) {
    console.error('Error in deleteClass service:', error)
    throw new Error(error)
  }
}

const getClassesByType = async (classType) => {
  try {
    const classes = await classModel.getClassesByType(classType)

    return {
      success: true,
      message: `Get ${classType} classes successfully`,
      classes: classes,
      total: classes.length,
    }
  } catch (error) {
    console.error('Error in getClassesByType service:', error)
    throw new Error(error)
  }
}

const getMemberEnrolledClasses = async (userId) => {
  try {
    const classes = await classModel.getMemberEnrolledClasses(userId)

    return {
      success: true,
      message: 'Get classes successfully',
      classes: classes,
      total: classes.length,
    }
  } catch (error) {
    console.error('Error in getClassesByType service:', error)
    throw new Error(error)
  }
}

const getListClassByLocationId = async (locationId) => {
  try {
    const classes = await classModel.getListClassByLocationId(locationId)

    return {
      success: true,
      message: 'Get classes by location successfully',
      classes: classes,
      total: classes.length,
    }
  } catch (error) {
    console.error('Error in getListClassByLocationId service:', error)
    throw new Error(error)
  }
}

export const classService = {
  addClass,
  getListClasses,
  getClassDetail,
  updateClass,
  deleteClass,
  getClassesByType,
  getListClassInfoForAdmin,
  getListClassInfoForUser,
  getMemberEnrolledClasses,
  getListClassInfoForTrainer,
  getListClassByLocationId,
}
