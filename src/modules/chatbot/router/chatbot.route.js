import express from 'express'
import { chatbotController } from '../controller/chatbot.controller.js'
import { authMiddleware } from '~/middlewares/auth.middleware.js'
import { moduleRateLimiters } from '~/middlewares/rateLimit.middleware.js'

const Router = express.Router()

// Base route: /api/chatbot

// ========================================
// PUBLIC ENDPOINTS (No Authentication)
// ========================================

// Health check endpoint - no rate limit for monitoring
Router.get('/health', chatbotController.getChatbotHealth)

// Anonymous chat endpoints - with rate limiting to prevent abuse
Router.post('/anonymous/message', moduleRateLimiters.chatbot.anonymous, chatbotController.sendAnonymousMessage)

Router.get(
  '/anonymous/conversation/:anonymousId',
  moduleRateLimiters.chatbot.anonymous,
  chatbotController.getAnonymousConversationHistory
)

// Quick replies for anonymous users
Router.get('/anonymous/quick-replies', chatbotController.getQuickReplies)

// ========================================
// AUTHENTICATED ENDPOINTS (Require Login)
// ========================================

// Authenticated chat endpoints
Router.post('/message', authMiddleware, moduleRateLimiters.chatbot.message, chatbotController.sendMessage)

Router.get('/conversation', authMiddleware, chatbotController.getConversationHistory)

// Quick replies for authenticated users
Router.get('/quick-replies', authMiddleware, chatbotController.getQuickReplies)

Router.post('/quick-replies', authMiddleware, moduleRateLimiters.chatbot.message, chatbotController.processQuickReply)

Router.post(
  '/link-anonymous',
  authMiddleware,
  moduleRateLimiters.chatbot.message,
  chatbotController.linkAnonymousConversation
)

// User-specific endpoints - users can only access their own data
Router.get(
  '/my/conversations',
  authMiddleware,
  (req, res, next) => {
    req.params.userId = req.user.id
    next()
  },
  chatbotController.getConversationsByUserId
)

Router.get(
  '/my/actions',
  authMiddleware,
  (req, res, next) => {
    req.params.userId = req.user.id
    next()
  },
  chatbotController.getActionsByUserId
)

// ========================================
// ADMIN ENDPOINTS (Require Admin Role)
// ========================================

// Conversations Management
Router.get(
  '/admin/conversations',
  authMiddleware,

  moduleRateLimiters.chatbot.admin,
  chatbotController.getAllConversations
)

Router.get(
  '/admin/conversations/:conversationId',
  authMiddleware,

  chatbotController.getConversationHistory
)

// User-specific data access for admins
Router.get(
  '/admin/user/:userId/conversations',
  authMiddleware,

  chatbotController.getConversationsByUserId
)

Router.get('/admin/user/:userId/actions', authMiddleware, chatbotController.getActionsByUserId)

// Actions Management
Router.get(
  '/admin/actions',
  authMiddleware,

  moduleRateLimiters.chatbot.admin,
  chatbotController.getAllActions
)

// Knowledge Base Management
Router.get('/admin/knowledge', authMiddleware, chatbotController.getAllKnowledge)

Router.post(
  '/admin/knowledge',
  authMiddleware,

  moduleRateLimiters.chatbot.admin,
  chatbotController.createKnowledgeBase
)

Router.put(
  '/admin/knowledge/:id',
  authMiddleware,

  moduleRateLimiters.chatbot.admin,
  chatbotController.updateKnowledgeBase
)

Router.delete(
  '/admin/knowledge/:id',
  authMiddleware,

  moduleRateLimiters.chatbot.admin,
  chatbotController.deleteKnowledge
)

// Gym Info Management
Router.get('/admin/gym-info', authMiddleware, chatbotController.getAllGymInfo)

Router.post(
  '/admin/gym-info',
  authMiddleware,

  moduleRateLimiters.chatbot.admin,
  chatbotController.createGymInfo
)

Router.put(
  '/admin/gym-info/:id',
  authMiddleware,

  moduleRateLimiters.chatbot.admin,
  chatbotController.updateGymInfo
)

Router.delete(
  '/admin/gym-info/:id',
  authMiddleware,

  moduleRateLimiters.chatbot.admin,
  chatbotController.deleteGymInfo
)

// Analytics & Reporting
Router.get(
  '/admin/analytics',
  authMiddleware,

  moduleRateLimiters.chatbot.admin,
  chatbotController.getChatbotAnalytics
)

// ========================================
// DEVELOPMENT ENDPOINTS (Development Only)
// ========================================

if (process.env.NODE_ENV === 'development') {
  // Intent testing endpoint
  Router.post('/dev/test-intent', authMiddleware, chatbotController.testIntentRecognition)

  // Seed test data endpoint - dangerous operation, heavily limited
  Router.post('/dev/seed-data', authMiddleware, chatbotController.seedTestData)

  // Debug endpoints - no rate limit in development
  Router.get('/dev/debug/conversations', authMiddleware, chatbotController.getAllConversations)

  Router.get('/dev/debug/actions', authMiddleware, chatbotController.getAllActions)

  Router.get('/dev/debug/knowledge', authMiddleware, chatbotController.getAllKnowledge)

  Router.get('/dev/debug/gym-info', authMiddleware, chatbotController.getAllGymInfo)
}

export const chatbotRoute = Router
