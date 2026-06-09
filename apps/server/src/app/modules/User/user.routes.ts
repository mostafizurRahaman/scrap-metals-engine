import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { userControllers } from './user.controllers'
import { userValidations } from './user.validations'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(userValidations.getAllUserSchema),
  userControllers.getAllUser
)

export const userRoutes = router
