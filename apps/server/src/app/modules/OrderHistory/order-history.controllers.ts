import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { orderHistoryServices } from './order-history.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

const getOrderHistoryById = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await orderHistoryServices.getOrderHistoryById(user, req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order history retrieved successfully!',
    data: result,
  })
})

export const orderHistoryControllers = {
  getOrderHistoryById,
}
