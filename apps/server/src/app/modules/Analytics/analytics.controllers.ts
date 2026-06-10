import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { analyticsServices } from './analytics.services'
import type { TGetDashboardOverviewQueryType } from './analytics.validations'

const getDashboardOverview = catchAsync(async (req, res) => {
  const result = await analyticsServices.getDashboardOverview(
    req.query as unknown as TGetDashboardOverviewQueryType
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The dashboard analytics retrived successfully!',
    data: result,
  })
})

export const analyticsControllers = {
  getDashboardOverview,
}
