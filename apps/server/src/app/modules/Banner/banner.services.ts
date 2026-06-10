import { Banner } from '@repo/db'
import httpStatus from 'http-status'
import { AppError, formatQuery, type BaseQueryParams } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type { TGetAllBannerQueryParamsType } from './banner.validations'
import { deleteSingleFileFromS3, uploadSingleFileToS3 } from 'packages/media-hub/src'

const createBanner = async (file: Express.Multer.File) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File is required!')
  }

  // Upload File:
  const { url } = await uploadSingleFileToS3(file, 'banner')

  const result = await Banner.create({
    url,
  })

  return result
}

const getAllBanner = async (query: TGetAllBannerQueryParamsType) => {
  const {
    page = 1,
    limit = 10,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
    dateFilter,
    skip,
  } = formatQuery(query as BaseQueryParams)

  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $project: {
      url: 1,
    },
  })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await Banner.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

const deleteBannerById = async (id: string) => {
  const result = await Banner.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Banner not found')
  }

  await deleteSingleFileFromS3(result.url)

  return result
}

export const bannerServices = {
  createBanner,

  getAllBanner,

  deleteBannerById,
}
