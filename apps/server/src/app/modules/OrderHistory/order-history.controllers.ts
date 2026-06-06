import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { orderHistoryServices } from './order-history.services'

const createOrderHistory = catchAsync(async (req, res) => {
  const result = await orderHistoryServices.createOrderHistory(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The order history created successfully!',
    data: result,
  })
})

const updateOrderHistory = catchAsync(async (req, res) => {
  const result = await orderHistoryServices.updateOrderHistory(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order history updated successfully!',
    data: result,
  })
})

const getAllOrderHistory = catchAsync(async (req, res) => {
  const result = await orderHistoryServices.getAllOrderHistory(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order history retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getOrderHistoryById = catchAsync(async (req, res) => {
  const result = await orderHistoryServices.getOrderHistoryById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order history retrieved successfully!',
    data: result,
  })
})

const deleteOrderHistoryById = catchAsync(async (req, res) => {
  const result = await orderHistoryServices.deleteOrderHistoryById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order history deleted successfully!',
    data: result,
  })
})

export const orderHistoryControllers = {
  createOrderHistory,
  updateOrderHistory,
  getAllOrderHistory,
  getOrderHistoryById,
  deleteOrderHistoryById
}