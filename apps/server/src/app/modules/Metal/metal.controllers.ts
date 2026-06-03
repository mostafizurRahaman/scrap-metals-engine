import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { metalServices } from './metal.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

const createMetal = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)

  const result = await metalServices.createMetal(user, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The metal created successfully!',
    data: result,
  })
})

const updateMetal = catchAsync(async (req, res) => {
  const result = await metalServices.updateMetal(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The metal updated successfully!',
    data: result,
  })
})

const getAllMetal = catchAsync(async (req, res) => {
  const result = await metalServices.getAllMetal(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The metal retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getMetalById = catchAsync(async (req, res) => {
  const result = await metalServices.getMetalById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The metal retrieved successfully!',
    data: result,
  })
})

const deleteMetalById = catchAsync(async (req, res) => {
  const result = await metalServices.deleteMetalById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The metal deleted successfully!',
    data: result,
  })
})

export const metalControllers = {
  createMetal,
  updateMetal,
  getAllMetal,
  getMetalById,
  deleteMetalById,
}
