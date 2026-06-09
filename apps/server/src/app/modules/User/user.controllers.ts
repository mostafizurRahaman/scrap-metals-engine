import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { userServices } from './user.services'

const getAllUser = catchAsync(async (req, res) => {
  const result = await userServices.getAllUser(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The user retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const userControllers = {
  getAllUser,
}
