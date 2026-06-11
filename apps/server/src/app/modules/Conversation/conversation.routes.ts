import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { conversationControllers } from './conversation.controllers'
import { conversationValidations } from './conversation.validations'

const router: Router = express.Router()

router.post(
  '/',
  validateRequest(conversationValidations.createConversationSchema),
  conversationControllers.createConversation
)

router.patch(
  '/:id',
  validateRequest(conversationValidations.updateConversationSchema),
  conversationControllers.updateConversation
)

router.get(
  '/all',
  validateRequest(conversationValidations.getAllConversationSchema),
  conversationControllers.getAllConversation
)

router.get(
  '/:id',
  validateRequest(conversationValidations.getConversationByIdSchema),
  conversationControllers.getConversationById
)

router.delete(
  '/:id',
  validateRequest(conversationValidations.deleteConversationByIdSchema),
  conversationControllers.deleteConversationById
)

export const conversationRoutes = router
