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

        const updateNotification = catchAsync(async (req, res) => {
          const result = await notificationServices.updateNotification(req.params.id as string, req.body)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The notification updated successfully!',
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

        const getNotificationById = catchAsync(async (req, res) => {
          const result = await notificationServices.getNotificationById(req.params.id as string)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The notification retrieved successfully!',
            data: result,
          })
        })

        const deleteNotificationById = catchAsync(async (req, res) => {
          const result = await notificationServices.deleteNotificationById(req.params.id as string)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The notification deleted successfully!',
            data: result,
          })
        })

        export const notificationControllers = {
          createNotification,
          updateNotification,
          getAllNotification,
          getNotificationById,
          deleteNotificationById
        }