import { catchAsync, sendResponse } from '@repo/shared'
        import httpStatus from 'http-status'
        import { messageServices } from './message.services'

        const createMessage = catchAsync(async (req, res) => {
          const result = await messageServices.createMessage(req.body)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.CREATED,
            message: 'The message created successfully!',
            data: result,
          })
        })

        const updateMessage = catchAsync(async (req, res) => {
          const result = await messageServices.updateMessage(req.params.id as string, req.body)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The message updated successfully!',
            data: result,
          })
        })

        const getAllMessage = catchAsync(async (req, res) => {
          const result = await messageServices.getAllMessage(req.query)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The message retrieved successfully!',
            data: result.data,
            meta: result.meta,
          })
        })

        const getMessageById = catchAsync(async (req, res) => {
          const result = await messageServices.getMessageById(req.params.id as string)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The message retrieved successfully!',
            data: result,
          })
        })

        const deleteMessageById = catchAsync(async (req, res) => {
          const result = await messageServices.deleteMessageById(req.params.id as string)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The message deleted successfully!',
            data: result,
          })
        })

        export const messageControllers = {
          createMessage,
          updateMessage,
          getAllMessage,
          getMessageById,
          deleteMessageById
        }