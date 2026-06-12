import { catchAsync, sendResponse } from '@repo/shared'
        import httpStatus from 'http-status'
        import { conversationUserServices } from './conversation-user.services'

        const createConversationUser = catchAsync(async (req, res) => {
          const result = await conversationUserServices.createConversationUser(req.body)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.CREATED,
            message: 'The conversation user created successfully!',
            data: result,
          })
        })

        const updateConversationUser = catchAsync(async (req, res) => {
          const result = await conversationUserServices.updateConversationUser(req.params.id as string, req.body)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The conversation user updated successfully!',
            data: result,
          })
        })

        const getAllConversationUser = catchAsync(async (req, res) => {
          const result = await conversationUserServices.getAllConversationUser(req.query)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The conversation user retrieved successfully!',
            data: result.data,
            meta: result.meta,
          })
        })

        const getConversationUserById = catchAsync(async (req, res) => {
          const result = await conversationUserServices.getConversationUserById(req.params.id as string)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The conversation user retrieved successfully!',
            data: result,
          })
        })

        const deleteConversationUserById = catchAsync(async (req, res) => {
          const result = await conversationUserServices.deleteConversationUserById(req.params.id as string)

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'The conversation user deleted successfully!',
            data: result,
          })
        })

        export const conversationUserControllers = {
          createConversationUser,
          updateConversationUser,
          getAllConversationUser,
          getConversationUserById,
          deleteConversationUserById
        }