import { Order, orderSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreateOrderPayloadType,
  TUpdateOrderPayloadType,
  TGetAllOrderQueryParamsType
} from "./order.validations"

const createOrder = async (payload: TCreateOrderPayloadType) => {
  const result = await Order.create(payload)
  return result
}

const updateOrder = async (id: string, payload: TUpdateOrderPayloadType) => {
  const result = await Order.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found")
  }

  return result
}

const getAllOrder = async (query: TGetAllOrderQueryParamsType) => {
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
        $or: orderSearchableFields.map(field => ({
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

  const aggregated = await Order.aggregate(pipeline)

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

const getOrderById = async (id: string) => {
  const result = await Order.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found")
  }

  return result
}

const deleteOrderById = async (id: string) => {
  const result = await Order.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found")
  }

  return result
}

export const orderServices = {
  createOrder,
  updateOrder,
  getAllOrder,
  getOrderById,
  deleteOrderById
}