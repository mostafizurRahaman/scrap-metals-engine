import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { orderServices } from './order.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

// ? Vehicle order created successfully.
const createVehicleOrder = catchAsync(async (req, res) => {
  const files = req.files as Express.Multer.File[]
  const user = await getUserFromRequest(req)
  const result = await orderServices.createVehicleOrder(user, req.body, files)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The vehicle order placed successfully!',
    data: result,
  })
})

const createMetalOrder = catchAsync(async (req, res) => {
  const files = req.files as Express.Multer.File[]
  const user = await getUserFromRequest(req)
  const result = await orderServices.createMetalOrder(user, req.body, files)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The metal order placed successfully!',
    data: result,
  })
})

const sendVehicleQoute = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const orderId = req.params.id as string
  const result = await orderServices.sendVehicleQoute(user, orderId, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Qoute request send successfully!',
    data: result,
  })
})

const sendMetalQoute = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const orderId = req.params.id as string
  const result = await orderServices.sendMetalQoute(user, orderId, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Qoute request send successfully!',
    data: result,
  })
})

const acceptQouteRequest = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const orderId = req.params.id as string
  const result = await orderServices.acceptQouteRequest(user, orderId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Qoute request has been accepted successfully!',
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
  createVehicleOrder,
  createMetalOrder,
  getAllOrder,
  getOrderById,
  deleteOrderById,

  // Qoute request:
  sendVehicleQoute,
  sendMetalQoute,
  acceptQouteRequest,
}
