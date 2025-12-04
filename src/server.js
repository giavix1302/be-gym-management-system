import express from 'express'
import { createServer } from 'http'
import dotenv from 'dotenv'
import corsConfig from './config/cors.config.js'
import cookieParser from 'cookie-parser'
import { errorHandler } from './middlewares/errorHandler.js'
import { APIs_V1 } from './routers/v1/index.js'
import { CONNECT_DB } from './config/mongodb.config.js'
import { initRedis } from '~/utils/redis.js' // CHỈ 1 Redis
import { initRedisListener, closeRedisListener } from '~/utils/redis-listener.js' // Listener
import { env } from './config/environment.config.js'
import { socketService } from '~/utils/socket.service.js'
import { startAllJobs } from './jobs/index.js'

const START_APP = () => {
  // Đọc biến môi trường từ file .env
  dotenv.config()

  // Tạo ứng dụng Express
  const app = express()

  // Tạo HTTP server để có thể tích hợp Socket.IO
  const server = createServer(app)

  // Middleware xử lý JSON body
  app.use(express.json())

  app.use(corsConfig)

  app.use(cookieParser())

  socketService.init(server)
  socketService.setupSocketAuth()
  socketService.handleConnection()
  console.log('✅ Socket.IO fully initialized with auth and handlers')

  // router
  app.use('/v1', APIs_V1)

  // Socket.IO status endpoint
  app.get('/v1/socket/status', (req, res) => {
    res.json({
      success: true,
      onlineUsers: socketService.getOnlineUsersCount(),
      users: socketService.getOnlineUsers(),
    })
  })

  // Lấy PORT từ biến môi trường hoặc mặc định là 3000
  const PORT = process.env.PORT || 3000

  app.use(errorHandler)

  // Khởi động server với HTTP server thay vì app
  server.listen(PORT, () => {
    console.log('---------------- BE', env.BE_URL)
    console.log('---------------- FE', env.FE_URL)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Dev server is running at http://localhost:${PORT}`)
    } else if (process.env.NODE_ENV === 'production') {
      console.log(`Production server is running on port ${PORT}`)
    } else {
      console.log(`Server is running at http://localhost:${PORT} (env: ${process.env.NODE_ENV})`)
    }
  })

  // Graceful shutdown
  const gracefulShutdown = async () => {
    console.log('📴 Server is shutting down...')

    try {
      // Đóng Redis listener
      await closeRedisListener()

      // Đóng server
      server.close(() => {
        console.log('✅ Server closed gracefully')
        process.exit(0)
      })
    } catch (error) {
      console.error('❌ Error during shutdown:', error)
      process.exit(1)
    }
  }

  // Thêm các signal handlers
  process.on('SIGINT', gracefulShutdown)
  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGHUP', gracefulShutdown)
}

;(async () => {
  try {
    console.log('Connecting to MongoDB Atlas...')
    await CONNECT_DB()
    console.log('Connected to MongoDB Atlas!')

    console.log('Connecting to Redis Cloud...')
    await initRedis()
    console.log('Connected to Redis Cloud!')

    // Khởi tạo Redis listener cho expired events
    console.log('Initializing Redis expired listener...')
    await initRedisListener()
    console.log('✅ Redis expired listener initialized!')

    // Start all scheduled jobs after database connections are established
    console.log('Starting scheduled jobs...')
    await startAllJobs()
    console.log('Scheduled jobs started successfully!')

    START_APP()
  } catch (error) {
    console.error('Error starting application:', error)
    process.exit(1)
  }
})()
