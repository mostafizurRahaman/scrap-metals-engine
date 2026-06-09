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

router.get('/:id', validateRequest(userValidations.getUserByIdSchema), userControllers.getUserById)

router.delete(
  '/:id',
  validateRequest(userValidations.deleteUserByIdSchema),
  userControllers.deleteUserById
)

export const userRoutes = router
