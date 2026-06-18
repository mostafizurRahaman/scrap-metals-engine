import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { fcmTokenServices } from './fcm-token.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

const updateFcmToken = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await fcmTokenServices.updateFcmToken(user, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The fcm token updated successfully!',
    data: result,
  })
})

export const fcmTokenControllers = {
  updateFcmToken,
}
