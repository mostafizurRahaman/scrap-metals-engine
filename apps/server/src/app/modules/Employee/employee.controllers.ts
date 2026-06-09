import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { employeeServices } from './employee.services'

const createEmployee = catchAsync(async (req, res) => {
  const result = await employeeServices.createEmployee(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The employee created successfully!',
    data: result,
  })
})

const updateEmployee = catchAsync(async (req, res) => {
  const result = await employeeServices.updateEmployee(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The employee updated successfully!',
    data: result,
  })
})

const getAllEmployee = catchAsync(async (req, res) => {
  const result = await employeeServices.getAllEmployee(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The employee retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getEmployeeById = catchAsync(async (req, res) => {
  const result = await employeeServices.getEmployeeById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The employee retrieved successfully!',
    data: result,
  })
})

const deleteEmployeeById = catchAsync(async (req, res) => {
  const result = await employeeServices.deleteEmployeeById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The employee deleted successfully!',
    data: result,
  })
})

export const employeeControllers = {
  createEmployee,
  updateEmployee,
  getAllEmployee,
  getEmployeeById,
  deleteEmployeeById,
}
