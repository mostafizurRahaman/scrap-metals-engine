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

// ? Order on the way:
router.post(
  '/on-the-way/:id',
  auth(AuthRoles.STAFF),
  validateRequest(orderValidations.startOnTheWaySchema),
  orderControllers.startOnTheWay
)

// ? Order Received :
router.post(
  '/received/:id',
  auth(AuthRoles.STAFF),
  validateRequest(orderValidations.receiveOrderSchema),
  orderControllers.receiveOrder
)

// ? Order Completed (Drop off)
router.post(
  '/complete/dropoff/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.completeDropoffOrderSchema),
  orderControllers.completeDropoffOrder
)
// ? Order Completed (Pikcup)
router.post(
  '/complete/pickup/:id',
  auth(AuthRoles.STAFF),
  validateRequest(orderValidations.completePickupOrderSchema),
  orderControllers.completePickupOrder
)
// ? Get all customer orders
router.get(
  '/customer/all',
  auth(AuthRoles.CUSTOMER),
  validateRequest(orderValidations.getAllOrderSchema),
  orderControllers.getCustomerAllOrder
)
// ? Get all orders (Admin)
router.get(
  '/admin/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.getAllOrderSchema),
  orderControllers.getAdminAllOrder
)

// ? Get Order details (All role)
router.get(
  '/:id',
  validateRequest(orderValidations.getOrderByIdSchema),
  orderControllers.getOrderById
)

export const orderRoutes = router
