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
  }).array('attachments'),
  auth(AuthRoles.CUSTOMER),
  validateRequest(orderValidations.createVihecleOrderSchema),
  orderControllers.createVehicleOrder
)

router.post(
  '/metal',
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('attachments'),
  auth(AuthRoles.CUSTOMER),
  validateRequest(orderValidations.createMetalOrder),
  orderControllers.createMetalOrder
)

router.post(
  '/vehicle/qoute/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.vehicleOrderQouteRequest),
  orderControllers.sendVehicleQoute
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
