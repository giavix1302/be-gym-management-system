import { createClient } from 'redis'
import { env } from '~/config/environment.config.js'
import { bookingModel } from '~/modules/booking/model/booking.model.js'

const redisCloud = createClient({
  username: 'default',
  password: env.REDIS_PASSWORD,
  socket: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
})

export const initRedis = async () => {
  if (!redisCloud.isOpen) {
    await redisCloud.connect()
  }

  // Enable keyspace notifications
  try {
    await redisCloud.configSet('notify-keyspace-events', 'Ex')
    console.log('✅ Redis keyspace notifications configured')
  } catch (error) {
    console.error('❌ Error configuring keyspace notifications:', error)
  }
}

redisCloud.on('error', (err) => {
  console.error('❌ Redis error:', err)
})

// ==========================================
// EXISTING FUNCTIONS - GIỮ NGUYÊN
// ==========================================

export const saveUserTemp = async (phone, userData) => {
  await redisCloud.set(`user:${phone}`, JSON.stringify(userData), {
    EX: 300, // 300 giây = 5 phút
  })
}

export const getUserTemp = async (phone) => {
  const data = await redisCloud.get(`user:${phone}`)
  return data ? JSON.parse(data) : null
}

// SỬA LẠI: Lưu cả backup data
export const saveLinkPaymentTemp = async (subId, data) => {
  // Lưu payment link chính
  await redisCloud.set(`user:${subId}`, JSON.stringify(data), {
    EX: 5 * 60,
  })

  // Lưu backup data để lấy khi expired
  await redisCloud.set(`backup:${subId}`, JSON.stringify(data), {
    EX: 6 * 60, // Thêm 1 phút để đảm bảo backup còn khi cần
  })
}

export const getLinkPaymentTemp = async (subId) => {
  const data = await redisCloud.get(`user:${subId}`)
  return data ? JSON.parse(data) : null
}

export const deleteLinkPaymentTemp = async (subId) => {
  await redisCloud.del(`user:${subId}`)
  await redisCloud.del(`backup:${subId}`) // Xóa cả backup
}

// ==========================================
// NEW FUNCTION - XỬ LÝ KHI EXPIRED
// ==========================================

export const handleBookingExpired = async (expiredKey) => {
  try {
    if (!expiredKey.startsWith('user:')) return

    const subId = expiredKey.replace('user:', '')
    console.log(`💳 Payment expired: ${subId}`)

    // Lấy backup data chứa idBookingArr
    const backupData = await redisCloud.get(`backup:${subId}`)

    if (backupData) {
      const paymentData = JSON.parse(backupData)

      if (paymentData.idBookingArr && paymentData.idBookingArr.length > 0) {
        console.log(`🗑️ Found ${paymentData.idBookingArr.length} booking IDs to delete:`, paymentData.idBookingArr)

        // Xóa chính xác những booking trong idBookingArr
        const result = await bookingModel.deleteMultiplePendingBookings(paymentData.idBookingArr)
        console.log(
          `✅ Auto-deleted ${result.deletedCount}/${paymentData.idBookingArr.length} expired pending bookings`
        )

        // Xóa backup data sau khi xử lý xong
        await redisCloud.del(`backup:${subId}`)
        console.log(`🧹 Cleaned up backup data: ${subId}`)
      } else {
        console.log(`⚠️ No idBookingArr found in backup data for: ${subId}`)
      }
    } else {
      console.log(`⚠️ No backup data found for expired payment: ${subId}`)
    }
  } catch (error) {
    console.error('❌ Error handling booking expiry:', error)
  }
}

export default redisCloud
