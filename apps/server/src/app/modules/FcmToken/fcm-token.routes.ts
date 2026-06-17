import express, { Router } from 'express'
        import { validateRequest } from '@app/middlewares'
        import { fcmTokenControllers } from './fcm-token.controllers'
        import { fcmTokenValidations } from './fcm-token.validations'

        const router : Router = express.Router()

        router.post(
          '/',
          validateRequest(fcmTokenValidations.createFcmTokenSchema),
          fcmTokenControllers.createFcmToken
        )

        router.patch(
          '/:id',
          validateRequest(fcmTokenValidations.updateFcmTokenSchema),
          fcmTokenControllers.updateFcmToken
        )

        router.get(
          '/all',
          validateRequest(fcmTokenValidations.getAllFcmTokenSchema),
          fcmTokenControllers.getAllFcmToken
        )

        router.get(
          '/:id',
          validateRequest(fcmTokenValidations.getFcmTokenByIdSchema),
          fcmTokenControllers.getFcmTokenById
        )

        router.delete(
          '/:id',
          validateRequest(fcmTokenValidations.deleteFcmTokenByIdSchema),
          fcmTokenControllers.deleteFcmTokenById
        )

        export const fcmTokenRoutes = router