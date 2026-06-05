import {
  AuthRoles,
  DeliveryMethod,
  GetPickupPoints,
  GetPickupPointsType,
  Order,
  orderSearchableFields,
  OrderStatus,
  OrderType,
  Vehicle,
  type IUser,
  type IVehicleOrder,
  type TPickupPointType,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateVihecleOrderPayloadType,
  TUpdateOrderPayloadType,
  TGetAllOrderQueryParamsType,
} from './order.validations'
import { generateUniqueOrderNumber } from './order.utils'
import { uploadMultipleFileToS3 } from 'packages/media-hub/src'

const createVehicleOrder = async (
  user: IUser,
  payload: TCreateVihecleOrderPayloadType,
  files: Express.Multer.File[]
) => {
  const {
    vinNumber,
    orderType,
    deliveryType,
    preferredDate,
    additionalNotes,
    lattitude,
    longitude,
    pickupAddress,
  } = payload

  // ?. Check is the user is customer?:
  if (user?.role !== AuthRoles.CUSTOMER) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Only customer can place an order.')
  }

  // ? Generate order number:
  const orderNumber = await generateUniqueOrderNumber()

  // ? Check is any order exists with same VIN number?:
  const hasOrderForVin = await Order.findOne({
    vinNumber,
  }).lean({
    _id: true,
  })
  if (hasOrderForVin) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Already have an order with this "${vinNumber}" vin number.`
    )
  }

  // ?. Order Type :
  if (deliveryType === DeliveryMethod.PICKUP) {
    if (!pickupAddress) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Pickup Address is required!')
    }

    if (!lattitude) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Lattitude is required!')
    }

    if (!longitude) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Longitude is required!')
    }
  }

  const attachments: string[] = []
  // ? Upload attachments:
  if (files && Array.isArray(files) && files?.length > 5) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You can upload max 5 files.')
  }

  if (files && Array.isArray(files) && files?.length >= 0) {
    const uploadedFiles = await uploadMultipleFileToS3(files, 'attachments')

    uploadedFiles.map((file) => {
      attachments.push(file.url)
    })
  }

  const newOrderPayload: Record<string, unknown> = {
    orderNumber,
    customer: user?._id,
    orderType,
    deliveryType,
    status: OrderStatus.PENDING,

    // Date fields:
    orderRequestedAt: new Date(),
    preferredDate: new Date(preferredDate),

    // Fields :
    subTotal: 0,

    additionalNotes,
    attachments,
  }

  // ? If the Delivery type is pickup:
  if (deliveryType === DeliveryMethod.PICKUP) {
    newOrderPayload.pickupAddress = pickupAddress
    newOrderPayload.pickupPoints = {
      type: GetPickupPoints.Point,
      coordinates: [longitude, lattitude],
    }
  }

  // ? Create the order:
  const order = Vehicle.create(newOrderPayload)

  return order
}

const updateOrder = async (id: string, payload: TUpdateOrderPayloadType) => {
  const result = await Order.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found')
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
    toDate,
  } = query

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: orderSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
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
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

const getOrderById = async (id: string) => {
  const result = await Order.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found')
  }

  return result
}

const deleteOrderById = async (id: string) => {
  const result = await Order.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found')
  }

  return result
}

export const orderServices = {
  createVehicleOrder,
  updateOrder,
  getAllOrder,
  getOrderById,
  deleteOrderById,
}
