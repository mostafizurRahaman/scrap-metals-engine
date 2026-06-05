import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { orderControllers } from './order.controllers'
import { orderValidations } from './order.validations'
import { multerFactory } from 'packages/media-hub/src'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.post(
  '/vehicle',
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('attachments'),
  auth(AuthRoles.CUSTOMER),
  validateRequest(orderValidations.createVihecleOrderSchema),
  orderControllers.createVehicleOrder
)

router.patch(
  '/:id',
  validateRequest(orderValidations.updateOrderSchema),
  orderControllers.updateOrder
)

router.get(
  '/all',
  validateRequest(orderValidations.getAllOrderSchema),
  orderControllers.getAllOrder
)

router.get(
  '/:id',
  validateRequest(orderValidations.getOrderByIdSchema),
  orderControllers.getOrderById
)

router.delete(
  '/:id',
  validateRequest(orderValidations.deleteOrderByIdSchema),
  orderControllers.deleteOrderById
)

export const orderRoutes = router
