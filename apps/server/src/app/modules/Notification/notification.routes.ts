import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { notificationControllers } from './notification.controllers'
import { notificationValidations } from './notification.validations'

const router: Router = express.Router()

router.post(
  '/',
  validateRequest(notificationValidations.createNotificationSchema),
  notificationControllers.createNotification
)

router.get(
  '/all',
  validateRequest(notificationValidations.getAllNotificationSchema),
  notificationControllers.getAllNotification
)

export const notificationRoutes = router
