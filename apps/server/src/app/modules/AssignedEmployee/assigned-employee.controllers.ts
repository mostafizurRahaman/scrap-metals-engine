import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { assignedEmployeeServices } from './assigned-employee.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

// ? 1. Create employee assignment.
const createAssignedEmployee = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await assignedEmployeeServices.createAssignedEmployee(user, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Employee assigned to order successfully.',
    data: result,
  })
})

// ? 2. Create employee assignment.
const cancelAssignedEmployee = catchAsync(async (req, res) => {
  const assignedId = req.params.id as string
  const user = await getUserFromRequest(req)
  const result = await assignedEmployeeServices.cancelAssignmentById(user, assignedId, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Employee assigned to order successfully.',
    data: result,
  })
})

// ?. 3 Create accept assignment:
const acceptAssignmentById = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const assignedId = req.params.id as string
  const result = await assignedEmployeeServices.acceptAssignmentById(user, assignedId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Assignment accepted successfully!',
    data: result,
  })
})

const getAllAssignedEmployee = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await assignedEmployeeServices.getAllAssignedEmployee(user, req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All assigments are retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getAssignedEmployeeById = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await assignedEmployeeServices.getAssignedEmployeeById(
    user,
    req.params.id as string
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The assigned employee retrieved successfully!',
    data: result,
  })
})

export const assignedEmployeeControllers = {
  createAssignedEmployee,
  cancelAssignedEmployee,
  acceptAssignmentById,
  getAllAssignedEmployee,
  getAssignedEmployeeById,
}
