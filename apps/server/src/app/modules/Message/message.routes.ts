import express, { Router } from 'express'
        import { validateRequest } from '@app/middlewares'
        import { messageControllers } from './message.controllers'
        import { messageValidations } from './message.validations'

        const router : Router = express.Router()

        router.post(
          '/',
          validateRequest(messageValidations.createMessageSchema),
          messageControllers.createMessage
        )

        router.patch(
          '/:id',
          validateRequest(messageValidations.updateMessageSchema),
          messageControllers.updateMessage
        )

        router.get(
          '/all',
          validateRequest(messageValidations.getAllMessageSchema),
          messageControllers.getAllMessage
        )

        router.get(
          '/:id',
          validateRequest(messageValidations.getMessageByIdSchema),
          messageControllers.getMessageById
        )

        router.delete(
          '/:id',
          validateRequest(messageValidations.deleteMessageByIdSchema),
          messageControllers.deleteMessageById
        )

        export const messageRoutes = router