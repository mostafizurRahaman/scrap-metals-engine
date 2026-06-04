import { Metal, metalSearchableFields, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import { AppError, formatQuery, type BaseQueryParams } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateMetalPayloadType,
  TUpdateMetalPayloadType,
  TGetAllMetalQueryParamsType,
} from './metal.validations'
import { slugify } from './metal.utils'

const createMetal = async (user: IUser, payload: TCreateMetalPayloadType) => {
  const { name, pricePerLbs, pricePerUnit } = payload

  // 1. Slugify the url:
  const slug = slugify(name)

  // 2. Check with this slug already any metal exists ?:
  const existingMetal = await Metal.findOne({
    slug,
  })
  if (existingMetal) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `A Metal already exists with this name ${name} & slug ${slug}`
    )
  }

  // Prepare payload:
  const newMetal = {
    name,
    slug,
    createdBy: user?._id,
    pricePerLbs,
    pricePerUnit,
  }

  const result = await Metal.create(newMetal)
  return result
}

const updateMetal = async (id: string, payload: TUpdateMetalPayloadType) => {
  const existingMetal = await Metal.findById(id)

  if (!existingMetal) {
    throw new AppError(httpStatus.NOT_FOUND, "Metal doesn't exist.")
  }

  // If name is being updated
  if (payload.name) {
    const slug = slugify(payload.name)

    // Check whether another metal already uses this slug
    const duplicateMetal = await Metal.findOne({
      slug,
      _id: { $ne: id },
    })

    if (duplicateMetal) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `A Metal already exists with this name ${payload.name} & slug ${slug}`
      )
    }

    existingMetal.name = payload.name
    existingMetal.slug = slug
  }

  if (payload.pricePerLbs !== undefined && payload.pricePerLbs !== existingMetal.pricePerLbs) {
    existingMetal.previousPricePerLbs = existingMetal.pricePerLbs
    existingMetal.pricePerLbs = payload.pricePerLbs
  }

  if (payload.pricePerUnit !== undefined && payload.pricePerUnit !== existingMetal.pricePerUnit) {
    existingMetal.previousPricePerUnit = existingMetal.pricePerUnit
    existingMetal.pricePerUnit = payload.pricePerUnit
  }

  await existingMetal.save()

  return existingMetal
}

const getAllMetal = async (query: TGetAllMetalQueryParamsType) => {
  const { page, limit, skip, searchTerm, dateFilter, fromDate, toDate, sortBy, sortOrder } =
    formatQuery(query as BaseQueryParams)

  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: metalSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $addFields: {
      priceTrendingForLbs: {
        $cond: [
          { $gt: ['$previousPricePerLbs', 0] },
          {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: ['$pricePerLbs', '$previousPricePerLbs'],
                      },
                      '$previousPricePerLbs',
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
          0,
        ],
      },
      priceTrendingForUnit: {
        $cond: [
          { $gt: ['$previousPricePerUnit', 0] },
          {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: ['$pricePerUnit', '$previousPricePerUnit'],
                      },
                      '$previousPricePerUnit',
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
          0,
        ],
      },
    },
  })

  pipeline.push({
    $addFields: {
      priceTrendingForKgDirection: {
        $switch: {
          branches: [
            {
              case: { $gt: ['$pricePerLbs', '$previousPricePerLbs'] },
              then: 'up',
            },
            {
              case: { $lt: ['$pricePerLbs', '$previousPricePerLbs'] },
              then: 'down',
            },
          ],
          default: 'unchanged',
        },
      },
      priceTrendingForUnitDirection: {
        $switch: {
          branches: [
            {
              case: { $gt: ['$pricePerUnit', '$previousPricePerUnit'] },
              then: 'up',
            },
            {
              case: { $lt: ['$pricePerUnit', '$previousPricePerUnit'] },
              then: 'down',
            },
          ],
          default: 'unchanged',
        },
      },
    },
  })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await Metal.aggregate(pipeline)

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

const getMetalById = async (id: string) => {
  const result = await Metal.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Metal not found')
  }

  return result
}

const deleteMetalById = async (id: string) => {
  const result = await Metal.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Metal not found')
  }

  return result
}

export const metalServices = {
  createMetal,
  updateMetal,
  getAllMetal,
  getMetalById,
  deleteMetalById,
}
