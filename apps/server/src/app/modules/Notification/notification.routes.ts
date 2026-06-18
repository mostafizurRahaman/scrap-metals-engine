import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { notificationControllers } from './notification.controllers'
import { notificationValidations } from './notification.validations'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.post('/', auth(), notificationControllers.createNotification)

router.post('/mark-as-read/all', auth(), notificationControllers.markAsReadAll)
router.patch('/mark-as-read/:id', auth(), notificationControllers.markAsRead)

router.get(
  '/all',
  auth(),
  validateRequest(notificationValidations.getAllNotificationSchema),
  notificationControllers.getAllNotification
)

export const notificationRoutes = router
