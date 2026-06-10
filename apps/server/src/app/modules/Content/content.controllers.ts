import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { contentServices } from './content.services'
import type { TContentType } from 'packages/db/src/apps/modules/Content/content.constant'

const updateContent = catchAsync(async (req, res) => {
  const result = await contentServices.updateContent(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The content updated successfully!',
    data: result,
  })
})

const getContentByType = catchAsync(async (req, res) => {
  const result = await contentServices.getContentByType(req.params.type as TContentType)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The content retrieved successfully!',
    data: result,
  })
})

export const contentControllers = {
  updateContent,
  getContentByType,
}
