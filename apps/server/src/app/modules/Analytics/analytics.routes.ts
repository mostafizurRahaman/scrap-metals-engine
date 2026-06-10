import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { analyticsControllers } from './analytics.controllers'
import { analyticsValidations } from './analytics.validations'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.get(
  '/dashboard',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(analyticsValidations.getDashboardOverview),
  analyticsControllers.getDashboardOverview
)

export const analyticsRoutes = router
