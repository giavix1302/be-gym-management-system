import { classModel } from '~/modules/class/model/class.model'
import { equipmentModel } from '~/modules/equipment/model/equipment.model'
import { locationModel } from '~/modules/location/model/location.model'
import { paymentModel } from '~/modules/payment/model/payment.model'
import { subscriptionModel } from '~/modules/subscription/model/subscription.model'
import { trainerModel } from '~/modules/trainer/model/trainer.model'
import { userModel } from '~/modules/user/model/user.model'
import { staffDashboardStatisticsModel } from '../model/staffDashboardStatistics.model'

const getDataDashboardForAdmin = async () => {
  try {
    const totalMembers = await userModel.getTotalActiveUsers()

    const totalRevenue = await paymentModel.getTotalRevenueByYear()

    const totalTrainers = await trainerModel.getTotalApprovedTrainers()

    const totalLocations = await locationModel.getTotalActiveLocations()

    const dataRevenue = await paymentModel.getRevenueChartData()

    const topLocation = await locationModel.getTopLocationsByAttendance()

    const topTrainer = await trainerModel.getTopTrainersByRevenue()

    const pendingTrainers = await trainerModel.getTotalPendingTrainers()

    const lowEnrollmentClasses = await classModel.getTotalLowEnrollmentClasses()

    const equipmentIssues = await equipmentModel.getTotalBrokenEquipments()

    const membershipExpiring = await subscriptionModel.getTotalSubscriptionsExpiringIn7Days()

    const revenueByPaymentType = await paymentModel.getRevenueByPaymentType()

    return {
      success: true,
      message: '',
      data: {
        overview: {
          totalMembers: totalMembers, // user
          totalRevenue: totalRevenue?.totalRevenue, // payment
          totalTrainers: totalTrainers, // trainer
          totalLocations: totalLocations, // location
        },
        revenueChart: {
          dataRevenue,
        },
        topPerformers: {
          locations: topLocation,
          trainers: topTrainer,
        },
        alerts: {
          pendingTrainers: pendingTrainers, // trainer
          lowEnrollmentClasses: lowEnrollmentClasses, // classes  + ClassEnrollments
          equipmentIssues: equipmentIssues, // equipments
          membershipExpiring: membershipExpiring, // subscription
        },
        revenueBreakdown: revenueByPaymentType,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getDataDashboardForStaff = async (locationId) => {
  try {
    const dashboardData = await staffDashboardStatisticsModel.getAllStaffDashboardData(locationId)

    return {
      success: true,
      message: 'Get staff dashboard data successfully',
      data: dashboardData,
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const statisticsService = {
  getDataDashboardForAdmin,
  getDataDashboardForStaff,
}
