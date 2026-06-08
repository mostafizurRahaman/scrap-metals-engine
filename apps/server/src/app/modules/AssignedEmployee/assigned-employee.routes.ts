import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { assignedEmployeeControllers } from './assigned-employee.controllers'
import { assignedEmployeeValidations } from './assigned-employee.validations'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(assignedEmployeeValidations.createAssignedEmployeeSchema),
  assignedEmployeeControllers.createAssignedEmployee
)

router.post(
  '/cancel/:id',
  auth(AuthRoles.STAFF),
  validateRequest(assignedEmployeeValidations.createAssignedEmployeeSchema),
  assignedEmployeeControllers.cancelAssignedEmployee
)

router.post(
  '/accept/:id',
  auth(AuthRoles.STAFF),
  validateRequest(assignedEmployeeValidations.acceptAssignmentSchema),
  assignedEmployeeControllers.acceptAssignmentById
)

router.patch(
  '/:id',
  validateRequest(assignedEmployeeValidations.updateAssignedEmployeeSchema),
  assignedEmployeeControllers.updateAssignedEmployee
)

router.get(
  '/all',
  validateRequest(assignedEmployeeValidations.getAllAssignedEmployeeSchema),
  assignedEmployeeControllers.getAllAssignedEmployee
)

router.get(
  '/:id',
  validateRequest(assignedEmployeeValidations.getAssignedEmployeeByIdSchema),
  assignedEmployeeControllers.getAssignedEmployeeById
)

router.delete(
  '/:id',
  validateRequest(assignedEmployeeValidations.deleteAssignedEmployeeByIdSchema),
  assignedEmployeeControllers.deleteAssignedEmployeeById
)

export const assignedEmployeeRoutes = router
