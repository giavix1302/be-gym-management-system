import express from 'express'
import { conversationController } from '../controller/conversation.controller'
import { conversationValidation } from '../validation/conversation.validation'
import { authMiddleware } from '~/middlewares/auth.middleware'

const Router = express.Router()

// ✅ ĐẶT ROUTE CỤ THỂ LÊN TRƯỚC (unread-count)
Router.route('/unread-count').get(authMiddleware, conversationController.getUnreadCount)

// ✅ ĐẶT ROUTE DYNAMIC XUỐNG SAU (/:id, /:conversationId)
Router.route('/:conversationId/messages/read').put(authMiddleware, conversationController.markMessagesAsRead)

Router.route('/:conversationId/messages')
  .get(authMiddleware, conversationController.getMessages)
  .post(authMiddleware, conversationController.sendMessage)

Router.route('/:id').get(conversationController.getConversations)

Router.route('/').post(authMiddleware, conversationController.createOrGetConversation)

export const conversationRoute = Router
