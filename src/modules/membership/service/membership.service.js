import { membershipModel } from '../model/membership.model'
import { membershipStatisticsModel } from '../model/membershipStatistics.model'
import { sanitize } from '~/utils/utils'

const addMembership = async (req) => {
  try {
    // check duplicate

    // handle data
    const image = req.file
    const { imgUrl, ...rest } = req.body

    const membershipToAdd = {
      ...rest,
      features: JSON.parse(req.body.features),
      bannerURL: image.path,
    }
    console.log('🚀 ~ addMembership ~ membershipToAdd:', membershipToAdd)

    // create membership
    const result = await membershipModel.createNew(membershipToAdd)

    // Get the newly created membership
    const membership = await membershipModel.getDetailById(result.insertedId)
    return {
      success: true,
      message: 'Membership created successfully',
      membership: membership,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getListMembership = async () => {
  try {
    const list = await membershipModel.getListWithQuantityUser()

    const arr = Object.values(list)
    console.log('🚀 ~ getListMembership ~ arr:', arr)

    return {
      success: true,
      message: 'Get list membership successfully',
      memberships: arr,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateMemberShip = async (req) => {
  try {
    // transform data
    const membershipId = req.params.id
    const banner = req.file
    const features = req.body.features

    const updateData = {
      ...req.body,
      ...(banner && { bannerURL: banner.path }),
      ...(features && { features: JSON.parse(req.body.features) }),
      updatedAt: Date.now(),
    }
    console.log('🚀 ~ updateMemberShip ~ updateData:', updateData)

    const updatedMembership = await membershipModel.updateInfo(membershipId, updateData)

    // check membership exist
    if (updatedMembership === null) {
      return {
        success: false,
        message: 'Product does not exist.',
      }
    }

    return {
      success: true,
      message: 'Membership updated successfully',
      updatedMembership,
    }
  } catch (error) {
    throw new Error(error)
  }
}

const deleteMembership = async (productId) => {
  try {
    // handle data
    const result = await membershipModel.deleteMembership(productId)
    // const memberships = await membershipModel.getListWithQuantityUser()
    return {
      success: result === 1,
      message: result === 1 ? 'Delete done!' : 'Delete false!',
      // memberships: result === 1 ? [...memberships] : '',
    }
  } catch (error) {
    throw new Error(error)
  }
}

// =================================================================================
// MEMBERSHIP STATISTICS FUNCTIONS
// =================================================================================

/**
 * Lấy tổng quan membership (4 cards)
 * @param {object} timeFilter - Filter thời gian {startDate, endDate}
 * @returns {object} Overview data cho 4 cards
 */
const getMembershipOverview = async (timeFilter = {}) => {
  try {
    // Tạm thời bỏ filter thời gian cho overview để lấy tất cả data
    // const { startDate, endDate } = timeFilter

    // Thực hiện tất cả queries parallel để tăng performance
    const [totalRevenue, totalMembershipPackages, totalActiveSubscriptions, inactiveUsersCount] = await Promise.all([
      membershipStatisticsModel.getTotalMembershipRevenue(), // Bỏ startDate, endDate
      membershipStatisticsModel.getTotalActiveMemberships(), // Số gói membership có sẵn (3 gói)
      membershipStatisticsModel.getTotalActiveSubscriptions(), // Bỏ startDate, endDate
      membershipStatisticsModel.getInactiveUsersCount(), // Restore function call
    ])

    console.log('🔍 getMembershipOverview - Final results:', {
      totalRevenue,
      totalMembershipPackages,
      totalActiveSubscriptions,
      inactiveUsersCount,
    })

    return {
      success: true,
      message: 'Get membership overview successfully',
      data: {
        totalRevenue,
        totalMembershipPackages, // Số gói có sẵn
        totalActiveSubscriptions, // Số người đang có gói tập
        inactiveUsersCount, // Số người không có gói tập
      },
    }
  } catch (error) {
    throw new Error(`Error getting membership overview: ${error.message}`)
  }
}

/**
 * Lấy dữ liệu biểu đồ doanh thu membership theo thời gian
 * @param {object} params - {startDate, endDate, groupBy}
 * @returns {object} Dữ liệu cho biểu đồ cột
 */
const getMembershipRevenueChart = async (params = {}) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = params

    if (!startDate || !endDate) {
      return {
        success: false,
        message: 'startDate and endDate are required',
        data: [],
      }
    }

    const chartData = await membershipStatisticsModel.getMembershipRevenueByTime(startDate, endDate, groupBy)

    return {
      success: true,
      message: 'Get membership revenue chart successfully',
      data: chartData,
    }
  } catch (error) {
    throw new Error(`Error getting membership revenue chart: ${error.message}`)
  }
}

/**
 * Lấy dữ liệu biểu đồ xu hướng đăng ký membership
 * @param {object} params - {startDate, endDate, groupBy}
 * @returns {object} Dữ liệu cho biểu đồ đường
 */
const getMembershipTrendsChart = async (params = {}) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = params

    if (!startDate || !endDate) {
      return {
        success: false,
        message: 'startDate and endDate are required',
        data: [],
      }
    }

    const chartData = await membershipStatisticsModel.getMembershipTrendsByTime(startDate, endDate, groupBy)

    return {
      success: true,
      message: 'Get membership trends chart successfully',
      data: chartData,
    }
  } catch (error) {
    throw new Error(`Error getting membership trends chart: ${error.message}`)
  }
}

/**
 * Lấy tất cả dữ liệu analytics membership (overview + charts)
 * @param {object} params - {startDate, endDate, groupBy}
 * @returns {object} Tất cả dữ liệu analytics
 */
const getMembershipAnalytics = async (params = {}) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = params

    if (!startDate || !endDate) {
      return {
        success: false,
        message: 'startDate and endDate are required',
      }
    }

    // Thực hiện tất cả queries parallel
    const [overview, revenueChart, trendsChart] = await Promise.all([
      getMembershipOverview({ startDate, endDate }),
      getMembershipRevenueChart({ startDate, endDate, groupBy }),
      getMembershipTrendsChart({ startDate, endDate, groupBy }),
    ])

    return {
      success: true,
      message: 'Get membership analytics successfully',
      data: {
        overview: overview.data,
        charts: {
          revenue: revenueChart.data,
          trends: trendsChart.data,
        },
      },
    }
  } catch (error) {
    throw new Error(`Error getting membership analytics: ${error.message}`)
  }
}

export const membershipService = {
  addMembership,
  getListMembership,
  updateMemberShip,
  deleteMembership,

  // Statistics functions
  getMembershipOverview,
  getMembershipRevenueChart,
  getMembershipTrendsChart,
  getMembershipAnalytics,
}
