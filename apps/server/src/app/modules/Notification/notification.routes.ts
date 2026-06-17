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

router.patch(
  '/:id',
  validateRequest(notificationValidations.updateNotificationSchema),
  notificationControllers.updateNotification
)

router.get(
  '/all',
  validateRequest(notificationValidations.getAllNotificationSchema),
  notificationControllers.getAllNotification
)

router.get(
  '/:id',
  validateRequest(notificationValidations.getNotificationByIdSchema),
  notificationControllers.getNotificationById
)

router.delete(
  '/:id',
  validateRequest(notificationValidations.deleteNotificationByIdSchema),
  notificationControllers.deleteNotificationById
)

export const notificationRoutes = router
