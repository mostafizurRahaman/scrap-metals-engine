import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { orderControllers } from './order.controllers'
import { orderValidations } from './order.validations'

const router: Router = express.Router()

router.post(
  '/vehicle',
  validateRequest(orderValidations.createVihecleOrderSchema),
  orderControllers.createOrder
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
