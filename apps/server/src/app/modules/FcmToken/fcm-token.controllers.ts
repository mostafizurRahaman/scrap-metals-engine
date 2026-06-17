import { catchAsync, sendResponse } from '@repo/shared'
        import httpStatus from 'http-status'
        import { fcmTokenServices } from './fcm-token.services'

        const createFcmToken = catchAsync(async (req, res) => {
          const result = await fcmTokenServices.createFcmToken(req.body)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.CREATED,
            message: 'The fcm token created successfully!',
            data: result,
          })
        })

        const updateFcmToken = catchAsync(async (req, res) => {
          const result = await fcmTokenServices.updateFcmToken(req.params.id as string, req.body)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The fcm token updated successfully!',
            data: result,
          })
        })

        const getAllFcmToken = catchAsync(async (req, res) => {
          const result = await fcmTokenServices.getAllFcmToken(req.query)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The fcm token retrieved successfully!',
            data: result.data,
            meta: result.meta,
          })
        })

        const getFcmTokenById = catchAsync(async (req, res) => {
          const result = await fcmTokenServices.getFcmTokenById(req.params.id as string)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The fcm token retrieved successfully!',
            data: result,
          })
        })

        const deleteFcmTokenById = catchAsync(async (req, res) => {
          const result = await fcmTokenServices.deleteFcmTokenById(req.params.id as string)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The fcm token deleted successfully!',
            data: result,
          })
        })

        export const fcmTokenControllers = {
          createFcmToken,
          updateFcmToken,
          getAllFcmToken,
          getFcmTokenById,
          deleteFcmTokenById
        }