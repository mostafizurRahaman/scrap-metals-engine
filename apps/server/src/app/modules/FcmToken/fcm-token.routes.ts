import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { fcmTokenControllers } from './fcm-token.controllers'
import { fcmTokenValidations } from './fcm-token.validations'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.post(
  '/register',
  auth(),
  validateRequest(fcmTokenValidations.updateFcmTokenSchema),
  fcmTokenControllers.updateFcmToken
)

export const fcmTokenRoutes = router
