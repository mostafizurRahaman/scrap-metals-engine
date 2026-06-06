import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { orderControllers } from './order.controllers'
import { orderValidations } from './order.validations'
import { multerFactory } from 'packages/media-hub/src'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

// ? 1. Create vehicle order
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

// ? 2. Create metal order
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

// ?  3. Send qoute for vehicle order
router.post(
  '/vehicle/qoute/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.vehicleOrderQouteRequest),
  orderControllers.sendVehicleQoute
)

// ?  4. Send qoute for metal order
router.post(
  '/metal/qoute/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.metalOrderQouteRequest),
  orderControllers.sendMetalQoute
)

// ? 5. Accept qoute (customer)
router.post(
  '/accept/:id',
  auth(AuthRoles.CUSTOMER),
  validateRequest(orderValidations.acceptQouteRequestSchema),
  orderControllers.acceptQouteRequest
)

// ? 6. Cancel order:
router.post(
  '/cancel/:id',
  auth(AuthRoles.CUSTOMER),
  validateRequest(orderValidations.acceptQouteRequestSchema),
  orderControllers.cancelOrderById
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
