import { catchAsync, sendResponse } from '@repo/shared'
        import httpStatus from 'http-status'
        import { conversationServices } from './conversation.services'

        const createConversation = catchAsync(async (req, res) => {
          const result = await conversationServices.createConversation(req.body)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.CREATED,
            message: 'The conversation created successfully!',
            data: result,
          })
        })

        const updateConversation = catchAsync(async (req, res) => {
          const result = await conversationServices.updateConversation(req.params.id as string, req.body)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The conversation updated successfully!',
            data: result,
          })
        })

        const getAllConversation = catchAsync(async (req, res) => {
          const result = await conversationServices.getAllConversation(req.query)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The conversation retrieved successfully!',
            data: result.data,
            meta: result.meta,
          })
        })

        const getConversationById = catchAsync(async (req, res) => {
          const result = await conversationServices.getConversationById(req.params.id as string)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The conversation retrieved successfully!',
            data: result,
          })
        })

        const deleteConversationById = catchAsync(async (req, res) => {
          const result = await conversationServices.deleteConversationById(req.params.id as string)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The conversation deleted successfully!',
            data: result,
          })
        })

        export const conversationControllers = {
          createConversation,
          updateConversation,
          getAllConversation,
          getConversationById,
          deleteConversationById
        }