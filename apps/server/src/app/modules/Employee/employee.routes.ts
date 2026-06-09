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

router.patch(
  '/:id',
  validateRequest(employeeValidations.updateEmployeeSchema),
  employeeControllers.updateEmployee
)

router.get(
  '/all',
  validateRequest(employeeValidations.getAllEmployeeSchema),
  employeeControllers.getAllEmployee
)

router.get(
  '/:id',
  validateRequest(employeeValidations.getEmployeeByIdSchema),
  employeeControllers.getEmployeeById
)

router.delete(
  '/:id',
  validateRequest(employeeValidations.deleteEmployeeByIdSchema),
  employeeControllers.deleteEmployeeById
)

export const employeeRoutes = router
