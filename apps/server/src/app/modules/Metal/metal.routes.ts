import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { metalControllers } from './metal.controllers'
import { metalValidations } from './metal.validations'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(metalValidations.createMetalSchema),
  metalControllers.createMetal
)

router.patch(
  '/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(metalValidations.updateMetalSchema),
  metalControllers.updateMetal
)

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN, AuthRoles.CUSTOMER),
  validateRequest(metalValidations.getAllMetalSchema),
  metalControllers.getAllMetal
)

router.get(
  '/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN, AuthRoles.CUSTOMER),
  validateRequest(metalValidations.getMetalByIdSchema),
  metalControllers.getMetalById
)

router.delete(
  '/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(metalValidations.deleteMetalByIdSchema),
  metalControllers.deleteMetalById
)

export const metalRoutes = router
