import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { orderHistoryControllers } from './order-history.controllers'
import { orderHistoryValidations } from './order-history.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(orderHistoryValidations.createOrderHistorySchema),
  orderHistoryControllers.createOrderHistory
)

router.patch(
  '/:id',
  validateRequest(orderHistoryValidations.updateOrderHistorySchema),
  orderHistoryControllers.updateOrderHistory
)

router.get(
  '/all',
  validateRequest(orderHistoryValidations.getAllOrderHistorySchema),
  orderHistoryControllers.getAllOrderHistory
)

router.get(
  '/:id',
  validateRequest(orderHistoryValidations.getOrderHistoryByIdSchema),
  orderHistoryControllers.getOrderHistoryById
)

router.delete(
  '/:id',
  validateRequest(orderHistoryValidations.deleteOrderHistoryByIdSchema),
  orderHistoryControllers.deleteOrderHistoryById
)

export const orderHistoryRoutes = router