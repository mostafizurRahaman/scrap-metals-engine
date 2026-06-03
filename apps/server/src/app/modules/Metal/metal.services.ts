import { Metal, metalSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreateMetalPayloadType,
  TUpdateMetalPayloadType,
  TGetAllMetalQueryParamsType
} from "./metal.validations"

const createMetal = async (payload: TCreateMetalPayloadType) => {
  const result = await Metal.create(payload)
  return result
}

const updateMetal = async (id: string, payload: TUpdateMetalPayloadType) => {
  const result = await Metal.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Metal not found")
  }

  return result
}

const getAllMetal = async (query: TGetAllMetalQueryParamsType) => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate
  } = query

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    const dateFilter : Record<string,unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: metalSearchableFields.map(field => ({
          [field]: { $regex: searchTerm, $options: 'i' }
        }))
      }
    })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }]
    }
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
      totalPages: Math.ceil(total / limit) || 1
    }
  }
}

const getMetalById = async (id: string) => {
  const result = await Metal.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Metal not found")
  }

  return result
}

const deleteMetalById = async (id: string) => {
  const result = await Metal.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Metal not found")
  }

  return result
}

export const metalServices = {
  createMetal,
  updateMetal,
  getAllMetal,
  getMetalById,
  deleteMetalById
}