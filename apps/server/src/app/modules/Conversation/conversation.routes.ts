import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { conversationControllers } from './conversation.controllers'
import { conversationValidations } from './conversation.validations'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.post(
  '/support',
  auth(AuthRoles.CUSTOMER, AuthRoles.STAFF),
  conversationControllers.createOrGetSupport
)

router.get(
  '/all',
  validateRequest(conversationValidations.getAllConversationSchema),
  conversationControllers.getAllConversation
)

export const conversationRoutes = router
