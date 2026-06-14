import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { conversationServices } from './conversation.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import type { TGetAllConversationQueryParamsType } from './conversation.validations'

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

const getAllConversationOrderType = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await conversationServices.getAllConversationOrderType(
    user,
    req.query as unknown as TGetAllConversationQueryParamsType
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The conversation retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const conversationControllers = {
  getAllConversationOrderType,
  createOrGetSupport,
}
