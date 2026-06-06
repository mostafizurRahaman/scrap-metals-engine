import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { assignedEmployeeControllers } from './assigned-employee.controllers'
import { assignedEmployeeValidations } from './assigned-employee.validations'

const router: Router = express.Router()

router.post(
  '/assign',
  validateRequest(assignedEmployeeValidations.createAssignedEmployeeSchema),
  assignedEmployeeControllers.createAssignedEmployee
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
