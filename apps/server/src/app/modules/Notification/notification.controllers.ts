import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { notificationServices } from './notification.services'

const createNotification = catchAsync(async (req, res) => {
  const result = await notificationServices.createNotification(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The notification created successfully!',
    data: result,
  })
})

const getAllNotification = catchAsync(async (req, res) => {
  const result = await notificationServices.getAllNotification(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The notification retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const notificationControllers = {
  createNotification,
  getAllNotification,
}
