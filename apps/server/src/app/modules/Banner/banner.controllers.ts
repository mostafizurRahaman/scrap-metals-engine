import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { bannerServices } from './banner.services'

const createBanner = catchAsync(async (req, res) => {
  const result = await bannerServices.createBanner(req.file as Express.Multer.File)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The banner created successfully!',
    data: result,
  })
})

const getAllBanner = catchAsync(async (req, res) => {
  const result = await bannerServices.getAllBanner(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The banner retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const deleteBannerById = catchAsync(async (req, res) => {
  const result = await bannerServices.deleteBannerById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The banner deleted successfully!',
    data: result,
  })
})

export const bannerControllers = {
  createBanner,

  getAllBanner,

  deleteBannerById,
}
