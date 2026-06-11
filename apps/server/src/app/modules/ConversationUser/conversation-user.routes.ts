import express, { Router } from 'express'
        import { validateRequest } from '@app/middlewares'
        import { conversationUserControllers } from './conversation-user.controllers'
        import { conversationUserValidations } from './conversation-user.validations'

        const router : Router = express.Router()

        router.post(
          '/',
          validateRequest(conversationUserValidations.createConversationUserSchema),
          conversationUserControllers.createConversationUser
        )

        router.patch(
          '/:id',
          validateRequest(conversationUserValidations.updateConversationUserSchema),
          conversationUserControllers.updateConversationUser
        )

        router.get(
          '/all',
          validateRequest(conversationUserValidations.getAllConversationUserSchema),
          conversationUserControllers.getAllConversationUser
        )

        router.get(
          '/:id',
          validateRequest(conversationUserValidations.getConversationUserByIdSchema),
          conversationUserControllers.getConversationUserById
        )

        router.delete(
          '/:id',
          validateRequest(conversationUserValidations.deleteConversationUserByIdSchema),
          conversationUserControllers.deleteConversationUserById
        )

        export const conversationUserRoutes = router