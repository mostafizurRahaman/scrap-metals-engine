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
  validateRequest(assignedEmployeeValidations.cancelAssignedEmployeeById),
  assignedEmployeeControllers.cancelAssignedEmployee
)

router.post(
  '/accept/:id',
  auth(AuthRoles.STAFF),
  validateRequest(assignedEmployeeValidations.acceptAssignmentSchema),
  assignedEmployeeControllers.acceptAssignmentById
)

router.get(
  '/all',
  auth(AuthRoles.STAFF),
  validateRequest(assignedEmployeeValidations.getAllAssignedEmployeeSchema),
  assignedEmployeeControllers.getAllAssignedEmployee
)

router.get(
  '/ongoing',
  auth(AuthRoles.STAFF),
  assignedEmployeeControllers.getCurrentOngoingAssignment
)

router.get('/pending', auth(AuthRoles.STAFF), assignedEmployeeControllers.getPendingAssignment)

router.get(
  '/:id',
  auth(AuthRoles.STAFF),
  validateRequest(assignedEmployeeValidations.getAssignedEmployeeByIdSchema),
  assignedEmployeeControllers.getAssignedEmployeeById
)

export const assignedEmployeeRoutes = router
