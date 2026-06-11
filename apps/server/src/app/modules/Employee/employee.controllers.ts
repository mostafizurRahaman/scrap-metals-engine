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

export const employeeControllers = {
  createEmployee,

  getAllEmployee,
}
