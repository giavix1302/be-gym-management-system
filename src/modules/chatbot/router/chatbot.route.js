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
// AUTHENTICATED ENDPOINTS (✅ UPDATED: Use userId in params, NO authMiddleware)
// ========================================

// Authenticated chat endpoints - ✅ UPDATED: userId in params
Router.post('/message/:userId', moduleRateLimiters.chatbot.message, chatbotController.sendMessage)

// Conversation history - ✅ UPDATED: userId in params
Router.get('/conversation/:userId', chatbotController.getConversationHistory)
Router.get('/conversation/:userId/:conversationId', chatbotController.getConversationHistory)

// Quick replies for authenticated users - ✅ UPDATED: userId in params
Router.get('/quick-replies/:userId', chatbotController.getQuickReplies)

Router.post('/quick-replies/:userId', moduleRateLimiters.chatbot.message, chatbotController.processQuickReply)

// Link anonymous conversation - ✅ UPDATED: userId in params
Router.post('/link-anonymous/:userId', moduleRateLimiters.chatbot.message, chatbotController.linkAnonymousConversation)

// User-specific endpoints - ✅ UPDATED: userId in params
Router.get('/my/conversations/:userId', chatbotController.getConversationsByUserId)

export const chatbotRoute = Router
