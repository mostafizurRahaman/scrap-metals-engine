import {
  AuthRoles,
  DeliveryMethod,
  GetPickupPoints,
  Metal,
  Order,
  orderSearchableFields,
  OrderStatus,
  Vehicle,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateVihecleOrderPayloadType,
  TUpdateOrderPayloadType,
  TGetAllOrderQueryParamsType,
  TCreateMetalOrderPayloadType,
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
    vinNumber,
    customer: user?._id,
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
    newOrderPayload.pickupPoint = {
      type: GetPickupPoints.Point,
      coordinates: [longitude, lattitude],
    }
  }
  console.log(newOrderPayload)

  // ? Create the order:
  const order = Vehicle.create(newOrderPayload)

  return order
}

const createMetalOrder = async (
  user: IUser,
  payload: TCreateMetalOrderPayloadType,
  files: Express.Multer.File[]
) => {
  const { preferredDate, additionalNotes, items } = payload

  // ?. Check is the user is customer?:
  if (user?.role !== AuthRoles.CUSTOMER) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Only customer can place an order.')
  }

  // ? Generate order number:
  const orderNumber = await generateUniqueOrderNumber()

  // ? Check how many items are
  if (!items || !Array.isArray(items) || items?.length < 1) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Mininum one item is required!')
  }

  // ? Filterout all the items ids:
  const ids = items.map((item) => item.metal)
  const allMetals = await Metal.find({
    _id: {
      $in: ids,
    },
  })

  if (!allMetals || !Array.isArray(allMetals) || allMetals?.length < ids?.length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Some metals are missing!')
  }

  // ? Create map for quantity:
  const quantityMap = new Map()
  items?.map((item) => quantityMap.set(item.metal?.toString(), item.quantity))

  // ? Has only Positive quantities ?:
  const hasOnlyPositiveQuantities = quantityMap.values().every((qty) => qty > 0)
  if (!hasOnlyPositiveQuantities) {
    throw new AppError(httpStatus.BAD_REQUEST, 'All metal quantities should be greater than 0.')
  }

  // ? Calcualte subtotal for quantity
  const subTotal = allMetals?.reduce((sum, metal) => {
    sum = sum + quantityMap.get(metal._id?.toString()) * metal.price
    return sum
  }, 0)

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
    status: OrderStatus.PENDING,
    deliveryType: DeliveryMethod.DROPOFF,
    // Date fields:
    orderRequestedAt: new Date(),
    preferredDate: new Date(preferredDate),

    // Fields :
    subTotal,

    additionalNotes,
    attachments,
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
  createMetalOrder,
  updateOrder,
  getAllOrder,
  getOrderById,
  deleteOrderById,
}
