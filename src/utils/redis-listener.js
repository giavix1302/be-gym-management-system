import { createClient } from 'redis'
import { env } from '~/config/environment.config.js'
import { handleBookingExpired } from '~/utils/redis.js' // Dùng function từ redis.js

// Tạo Redis client riêng cho subscriber
const redisSubscriber = createClient({
  username: 'default',
  password: env.REDIS_PASSWORD,
  socket: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
})

export const initRedisListener = async () => {
  try {
    console.log('🔄 Initializing Redis expired listener...')

    if (!redisSubscriber.isOpen) {
      await redisSubscriber.connect()
    }

    // Lắng nghe event key expired
    await redisSubscriber.pSubscribe('__keyevent@0__:expired', async (expiredKey) => {
      console.log('⏰ Redis key expired:', expiredKey)

      // Gọi function xử lý từ redis.js
      await handleBookingExpired(expiredKey)
    })

    console.log('✅ Redis expired listener started successfully')
  } catch (error) {
    console.error('❌ Error initializing Redis listener:', error)
    throw error
  }
}

// Graceful shutdown
export const closeRedisListener = async () => {
  try {
    if (redisSubscriber.isOpen) {
      await redisSubscriber.quit()
      console.log('✅ Redis listener closed')
    }
  } catch (error) {
    console.error('❌ Error closing Redis listener:', error)
  }
}

export default redisSubscriber
