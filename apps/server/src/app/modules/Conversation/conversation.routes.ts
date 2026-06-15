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
  auth(),
  validateRequest(conversationValidations.getAllConversationSchema),
  conversationControllers.getAllConversationOrderType
)

router.get(
  '/all/support',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(conversationValidations.getAllConversationSchema),
  conversationControllers.getAllSupportConversationForAdmin
)

export const conversationRoutes = router
