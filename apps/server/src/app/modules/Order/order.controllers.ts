import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { orderServices } from './order.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

const createOrder = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await orderServices.createOrder(user, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The order created successfully!',
    data: result,
  })
})

const updateOrder = catchAsync(async (req, res) => {
  const result = await orderServices.updateOrder(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order updated successfully!',
    data: result,
  })
})

const getAllOrder = catchAsync(async (req, res) => {
  const result = await orderServices.getAllOrder(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getOrderById = catchAsync(async (req, res) => {
  const result = await orderServices.getOrderById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order retrieved successfully!',
    data: result,
  })
})

const deleteOrderById = catchAsync(async (req, res) => {
  const result = await orderServices.deleteOrderById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order deleted successfully!',
    data: result,
  })
})

export const orderControllers = {
  createOrder,
  updateOrder,
  getAllOrder,
  getOrderById,
  deleteOrderById,
}
