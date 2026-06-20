import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { userServices } from './user.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

const getAllUser = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await userServices.getAllUser(user, req.query)

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
