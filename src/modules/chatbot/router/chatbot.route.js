import express from 'express'
import { chatbotController } from '../controller/chatbot.controller.js'
import { authMiddleware } from '~/middlewares/auth.middleware.js'
import { moduleRateLimiters } from '~/middlewares/rateLimit.middleware.js'
import { chatbotRateLimitMiddleware, addRateLimitHeaders } from '~/middlewares/chatbotRateLimit.middleware.js'

const Router = express.Router()

// Base route: /api/chatbot

// ========================================
// PUBLIC ENDPOINTS (No Authentication)
// ========================================

// Health check endpoint - no rate limit for monitoring
Router.get('/health', chatbotController.getChatbotHealth)

// Anonymous chat endpoints - with daily rate limiting (15 messages/day)
Router.post(
  '/anonymous/message',
  chatbotRateLimitMiddleware,
  addRateLimitHeaders,
  chatbotController.sendAnonymousMessage
)

Router.get(
  '/anonymous/conversation/:anonymousId',
  moduleRateLimiters.chatbot.anonymous,
  chatbotController.getAnonymousConversationHistory
)

// DEPRECATED: Quick replies (AI handles naturally now, kept for backward compatibility)
Router.get('/anonymous/quick-replies', chatbotController.getQuickReplies)

// ========================================
// AUTHENTICATED ENDPOINTS (✅ UPDATED: Use userId in params, NO authMiddleware)
// ========================================

// Authenticated chat endpoints - with daily rate limiting (100 messages/day)
Router.post('/message/:userId', chatbotRateLimitMiddleware, addRateLimitHeaders, chatbotController.sendMessage)

// Conversation history - ✅ UPDATED: userId in params
Router.get('/conversation/:userId', chatbotController.getConversationHistory)
Router.get('/conversation/:userId/:conversationId', chatbotController.getConversationHistory)

// DEPRECATED: Quick replies (AI handles naturally now, kept for backward compatibility)
Router.get('/quick-replies/:userId', chatbotController.getQuickReplies)
Router.post('/quick-replies/:userId', moduleRateLimiters.chatbot.message, chatbotController.processQuickReply)

// Link anonymous conversation - ✅ UPDATED: userId in params
Router.post('/link-anonymous/:userId', moduleRateLimiters.chatbot.message, chatbotController.linkAnonymousConversation)

// User-specific endpoints - ✅ UPDATED: userId in params
Router.get('/my/conversations/:userId', chatbotController.getConversationsByUserId)

export const chatbotRoute = Router
