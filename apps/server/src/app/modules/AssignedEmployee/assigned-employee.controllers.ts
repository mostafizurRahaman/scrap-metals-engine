import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { assignedEmployeeServices } from './assigned-employee.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

const createAssignedEmployee = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await assignedEmployeeServices.createAssignedEmployee(user, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Employee assigned to order successfully.',
    data: result,
  })
})

const updateAssignedEmployee = catchAsync(async (req, res) => {
  const result = await assignedEmployeeServices.updateAssignedEmployee(
    req.params.id as string,
    req.body
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The assigned employee updated successfully!',
    data: result,
  })
})

const getAllAssignedEmployee = catchAsync(async (req, res) => {
  const result = await assignedEmployeeServices.getAllAssignedEmployee(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The assigned employee retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getAssignedEmployeeById = catchAsync(async (req, res) => {
  const result = await assignedEmployeeServices.getAssignedEmployeeById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The assigned employee retrieved successfully!',
    data: result,
  })
})

const deleteAssignedEmployeeById = catchAsync(async (req, res) => {
  const result = await assignedEmployeeServices.deleteAssignedEmployeeById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The assigned employee deleted successfully!',
    data: result,
  })
})

export const assignedEmployeeControllers = {
  createAssignedEmployee,
  updateAssignedEmployee,
  getAllAssignedEmployee,
  getAssignedEmployeeById,
  deleteAssignedEmployeeById,
}
