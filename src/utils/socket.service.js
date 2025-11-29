import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from '~/config/environment.config.js'

class SocketService {
  constructor() {
    this.io = null
    this.onlineUsers = new Map() // Map<userId, Set<socketId>>
  }

  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000', env.FE_URL || 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    })
  }

  setupSocketAuth() {
    if (!this.io) {
      return
    }

    this.io.use((socket, next) => {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.query.token ||
        socket.request.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        return next(new Error('Authentication error: No token provided'))
      }

      try {
        if (!env.JWT_SECRET) {
          return next(new Error('Server configuration error'))
        }

        const decoded = jwt.verify(token, env.JWT_SECRET)

        if (!decoded.userId) {
          return next(new Error('Invalid token: userId missing'))
        }

        socket.userId = decoded.userId
        socket.userRole = decoded.role || 'user'
        next()
      } catch (error) {
        next(new Error('Authentication error: Invalid token'))
      }
    })
  }

  handleConnection() {
    if (!this.io) {
      return
    }

    this.io.on('connection', (socket) => {
      // Track online status
      if (!this.onlineUsers.has(socket.userId)) {
        this.onlineUsers.set(socket.userId, new Set())
      }
      this.onlineUsers.get(socket.userId).add(socket.id)

      // JOIN CONVERSATION
      socket.on('join_conversation', async (conversationId) => {
        const roomName = `conversation_${conversationId}`
        await socket.join(roomName)
        socket.emit('joined_conversation', { conversationId, roomName })
      })

      // LEAVE CONVERSATION
      socket.on('leave_conversation', (conversationId) => {
        const roomName = `conversation_${conversationId}`
        socket.leave(roomName)
      })

      // TYPING INDICATOR
      socket.on('typing', ({ conversationId, isTyping }) => {
        const roomName = `conversation_${conversationId}`
        socket.to(roomName).emit('user_typing', {
          userId: socket.userId,
          conversationId,
          isTyping,
        })
      })

      // DISCONNECT
      socket.on('disconnect', (reason) => {
        // Remove from online users
        if (this.onlineUsers.has(socket.userId)) {
          this.onlineUsers.get(socket.userId).delete(socket.id)
          if (this.onlineUsers.get(socket.userId).size === 0) {
            this.onlineUsers.delete(socket.userId)
          }
        }
      })

      // ERROR
      socket.on('error', (error) => {
        // Handle socket errors silently
      })
    })
  }

  // Helper method to check if user is online
  isUserOnline(userId) {
    return this.onlineUsers.has(userId)
  }

  // Helper method to emit to specific user
  emitToUser(userId, event, data) {
    const userSockets = this.onlineUsers.get(userId)
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.io.to(socketId).emit(event, data)
      })
      return true
    }
    return false
  }

  // Helper methods for server status
  getOnlineUsersCount() {
    return this.onlineUsers.size
  }

  getOnlineUsers() {
    const users = []
    this.onlineUsers.forEach((sockets, userId) => {
      users.push({ userId, socketCount: sockets.size })
    })
    return users
  }
}

export const socketService = new SocketService()
