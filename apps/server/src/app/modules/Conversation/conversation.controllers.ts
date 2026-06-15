import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { conversationServices } from './conversation.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import type {
  TGetAllConversationQueryParamsType,
  TGetAllMessageByConversationIDQueryType,
} from './conversation.validations'

const uploadFile = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File
  const result = await conversationServices.uploadFile(file)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Attachments uploaded successfully!',
    data: result,
  })
})

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

const getAllSupportConversationForAdmin = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await conversationServices.getAllSupportConversationForAdmin(
    user,
    req.query as unknown as TGetAllConversationQueryParamsType
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All support conversation retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getAllMessages = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const conversationId = req.params.id as string
  const result = await conversationServices.getAllMessages(
    user,
    conversationId,
    req.query as unknown as TGetAllMessageByConversationIDQueryType
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All message retreived successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const conversationControllers = {
  getAllConversationOrderType,
  createOrGetSupport,
  getAllSupportConversationForAdmin,
  getAllMessages,
  uploadFile,
}
