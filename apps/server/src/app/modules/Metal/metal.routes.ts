import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { metalControllers } from './metal.controllers'
import { metalValidations } from './metal.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(metalValidations.createMetalSchema),
  metalControllers.createMetal
)

router.patch(
  '/:id',
  validateRequest(metalValidations.updateMetalSchema),
  metalControllers.updateMetal
)

router.get(
  '/all',
  validateRequest(metalValidations.getAllMetalSchema),
  metalControllers.getAllMetal
)

router.get(
  '/:id',
  validateRequest(metalValidations.getMetalByIdSchema),
  metalControllers.getMetalById
)

router.delete(
  '/:id',
  validateRequest(metalValidations.deleteMetalByIdSchema),
  metalControllers.deleteMetalById
)

export const metalRoutes = router