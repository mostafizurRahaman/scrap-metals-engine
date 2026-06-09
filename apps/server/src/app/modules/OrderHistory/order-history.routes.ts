import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { orderHistoryControllers } from './order-history.controllers'
import { orderHistoryValidations } from './order-history.validations'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.get(
  '/:id',
  auth(AuthRoles.CUSTOMER),
  validateRequest(orderHistoryValidations.getOrderHistoryByIdSchema),
  orderHistoryControllers.getOrderHistoryById
)

export const orderHistoryRoutes = router
