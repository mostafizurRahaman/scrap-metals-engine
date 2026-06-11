import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { employeeControllers } from './employee.controllers'
import { employeeValidations } from './employee.validations'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(employeeValidations.createEmployeeSchema),
  employeeControllers.createEmployee
)

router.get(
  '/all',
  validateRequest(employeeValidations.getAllEmployeeSchema),
  employeeControllers.getAllEmployee
)

export const employeeRoutes = router
