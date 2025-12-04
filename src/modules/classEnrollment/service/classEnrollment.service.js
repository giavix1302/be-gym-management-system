import { paymentModel } from '~/modules/payment/model/payment.model'
import { classEnrollmentModel } from '../model/classEnrollment.model'
import { PAYMENT_STATUS } from '~/utils/constants'

const addClassEnrollment = async (data) => {
  try {
    const enrollmentToAdd = {
      ...data,
      enrolledAt: data.enrolledAt || new Date().toISOString(),
    }

    console.log('🚀 ~ addClassEnrollment ~ enrollmentToAdd:', enrollmentToAdd)

    // Create class enrollment
    const result = await classEnrollmentModel.createNew(enrollmentToAdd)

    // Get the newly created enrollment
    const enrollment = await classEnrollmentModel.getDetailById(result.insertedId)

    return {
      success: true,
      message: 'Class enrollment created successfully',
      enrollment: enrollment,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getListClassEnrollment = async () => {
  try {
    const list = await classEnrollmentModel.getListWithQuantityUser()

    const arr = Object.values(list)
    console.log('🚀 ~ getListClassEnrollment ~ arr:', arr)

    return {
      success: true,
      message: 'Get list class enrollment successfully',
      enrollments: arr,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateClassEnrollment = async (req) => {
  try {
    const enrollmentId = req.params.id

    const updateData = {
      ...req.body,
      updatedAt: Date.now(),
    }

    console.log('🚀 ~ updateClassEnrollment ~ updateData:', updateData)

    const updatedEnrollment = await classEnrollmentModel.updateInfo(enrollmentId, updateData)

    // Check if enrollment exists
    if (updatedEnrollment === null) {
      return {
        success: false,
        message: 'Class enrollment does not exist.',
      }
    }

    return {
      success: true,
      message: 'Class enrollment updated successfully',
      updatedEnrollment,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteClassEnrollment = async (enrollmentId) => {
  try {
    const result = await classEnrollmentModel.deleteMembership(enrollmentId)

    return {
      success: result === 1,
      message: result === 1 ? 'Delete done!' : 'Delete failed!',
    }
  } catch (error) {
    throw new Error(error)
  }
}

const cancelClassEnrollment = async (enrollmentId) => {
  try {
    // check xem có được refund không
    const isRefund = await classEnrollmentModel.canCancelEnrollment(enrollmentId)
    if (isRefund) {
      await paymentModel.updatePaymentByReferenceId(enrollmentId, {
        paymentStatus: PAYMENT_STATUS.REFUNDED,
      })
    }

    const result = await classEnrollmentModel.cancelEnrollment(enrollmentId)

    // Check if enrollment exists and was updated
    if (!result || result.value === null) {
      return {
        success: false,
        message: 'Class enrollment does not exist or could not be cancelled.',
      }
    }

    return {
      success: true,
      message: 'Class enrollment cancelled successfully',
      enrollment: result.value,
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const classEnrollmentService = {
  addClassEnrollment,
  getListClassEnrollment,
  updateClassEnrollment,
  deleteClassEnrollment,
  cancelClassEnrollment,
}
