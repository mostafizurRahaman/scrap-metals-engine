import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { conversationServices } from './conversation.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

const createOrGetSupport = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await conversationServices.createOrGetSupport(user)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Support created successfully!',
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

export const conversationControllers = {
  getAllConversation,
  createOrGetSupport,
}
