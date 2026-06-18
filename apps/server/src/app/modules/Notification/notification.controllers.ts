import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { notificationServices } from './notification.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

const createNotification = catchAsync(async (req, res) => {
  const result = await notificationServices.createNotification(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The notification created successfully!',
    data: result,
  })
})

const markAsRead = catchAsync(async (req, res) => {
  const notificationId = req.params.id as string
  const user = await getUserFromRequest(req)
  const result = await notificationServices.markedAsRead(user, notificationId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The notification has marked as read sucessfully.',
    data: result,
  })
})

const markAsReadAll = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await notificationServices.markedAsReadAll(user)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All notifications have marked as read sucessfully.',
    data: result,
  })
})

const getAllNotification = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await notificationServices.getAllNotification(user, req.query)

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
  markAsRead,
  markAsReadAll,
}
