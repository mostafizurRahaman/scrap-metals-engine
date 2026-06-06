/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AuthRoles,
  DeliveryMethod,
  GetPickupPoints,
  Metal,
  MetalOrder,
  Order,
  OrderHistory,
  orderSearchableFields,
  OrderStatus,
  OrderType,
  Vehicle,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError, ROLE_RANK } from '@repo/shared'
import mongoose, { Types, type PipelineStage } from 'mongoose'

import type {
  TCreateVihecleOrderPayloadType,
  TGetAllOrderQueryParamsType,
  TCreateMetalOrderPayloadType,
  TVehicleQouteRequestPayloadType,
  TMetalQouteRequestPayloadType,
} from './order.validations'
import { generateUniqueOrderNumber } from './order.utils'
import { uploadMultipleFileToS3 } from 'packages/media-hub/src'

// ? 1. Create vehicle
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

  // ALL status will work here.

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

  if (files && Array.isArray(files) && files?.length >= 1) {
    const uploadedFiles = await uploadMultipleFileToS3(files, 'attachments')

    uploadedFiles.forEach((file) => {
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
  const session = await mongoose.startSession()

  try {
    await session.startTransaction()
    // ? Create the order:
    const [order] = await Vehicle.create([newOrderPayload], {
      session,
    })

    if (!order?._id) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create order!')
    }

    // ? Order History
    await OrderHistory.create(
      [
        {
          order: order?._id,
          status: OrderStatus.PENDING,
          previousStatus: OrderStatus.PENDING,
          changedBy: user?._id,
          title: `Request Pending`,
          note: `Your request is being reviewed.`,
        },
      ],
      { session }
    )

    await session.commitTransaction()

    return order
  } catch (err: any) {
    await session.abortTransaction()
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message || 'Something went wrong!')
  } finally {
    await session.endSession()
  }
}
// ? 2. Create metal
const createMetalOrder = async (
  user: IUser,
  payload: TCreateMetalOrderPayloadType,
  files: Express.Multer.File[]
) => {
  const { preferredDate, additionalNotes, items } = payload

  // PENDING, QOUTED, ACCEPT, COMPLETED, CANCELLED

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
  const customerPriceMap: Map<string, number> = new Map()
  items?.forEach((item) => {
    quantityMap.set(item.metal?.toString(), item.quantity)
    customerPriceMap.set(item.metal?.toString(), item.price)
  })

  // ? systemPriceMap:
  const systemPriceMap: Map<string, number> = new Map()
  const metalInfoMap: Map<string, { name: string; unit: string }> = new Map()
  allMetals?.forEach((item) => {
    const id = item?._id?.toString()
    systemPriceMap.set(id, item?.price)
    metalInfoMap.set(id, { name: item.name, unit: item.unit })
  })

  function compareMaps(map1: Map<string, number>, map2: Map<string, number>) {
    let testVal
    if (map1.size !== map2.size) {
      return false
    }
    for (const [key, val] of map1) {
      testVal = map2.get(key)
      // in cases of an undefined value, make sure the key
      // actually exists on the object so there are no false positives
      if (testVal !== val || (testVal === undefined && !map2.has(key))) {
        return false
      }
    }
    return true
  }

  // ?. Compare price consistency:
  if (!compareMaps(customerPriceMap, systemPriceMap)) {
    throw new AppError(httpStatus.NOT_FOUND, `Metals prices are not matched!`)
  }

  //  ?. Now Check all prices are positive :
  const hasOnlyPostivePrices = [...systemPriceMap.values()].every((price) => price > 0)
  if (!hasOnlyPostivePrices) {
    throw new AppError(httpStatus.NOT_FOUND, 'Price should be postive always!')
  }

  // ? Has only Positive quantities ?:
  const hasOnlyPositiveQuantities = [...quantityMap.values()].every((qty) => qty > 0)
  if (!hasOnlyPositiveQuantities) {
    throw new AppError(httpStatus.BAD_REQUEST, 'All metal quantities should be greater than 0.')
  }

  // ? Calcualte subtotal for quantity
  const subTotal = allMetals?.reduce((sum, metal) => {
    const quantity = quantityMap.get(metal._id?.toString()) ?? 0
    sum = sum + quantity * metal.price
    return sum
  }, 0)

  const attachments: string[] = []
  // ? Upload attachments:
  if (files && Array.isArray(files) && files?.length > 5) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You can upload max 5 files.')
  }

  if (files && Array.isArray(files) && files?.length >= 1) {
    const uploadedFiles = await uploadMultipleFileToS3(files, 'attachments')

    uploadedFiles.forEach((file) => {
      attachments.push(file.url)
    })
  }

  const enrichedItems = items.map((item) => {
    const id = item.metal?.toString()
    const info = metalInfoMap.get(id)
    return {
      metal: item.metal,
      quantity: item.quantity,
      price: item.price,
      name: info!.name,
      unit: info!.unit,
    }
  })

  const session = await mongoose.startSession()

  try {
    session.startTransaction()
    const newOrderPayload: Record<string, unknown> = {
      orderNumber,
      customer: user?._id,
      status: OrderStatus.PENDING,
      deliveryType: DeliveryMethod.DROPOFF,
      // Date fields:
      orderRequestedAt: new Date(),
      preferredDate: new Date(preferredDate),

      items: enrichedItems,

      // Fields :
      subTotal,

      additionalNotes,
      attachments,
    }

    // ? Create the order:
    const [newOrder] = await MetalOrder.create([newOrderPayload], { session })

    if (!newOrder?._id) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create order!')
    }

    // ? Order History
    await OrderHistory.create(
      [
        {
          order: newOrder?._id,
          status: OrderStatus.PENDING,
          previousStatus: OrderStatus.PENDING,
          changedBy: user?._id,
          title: `Request Pending`,
          note: `Your request is being reviewed.`,
        },
      ],
      { session }
    )

    await session.commitTransaction()

    return newOrder
  } catch (err: any) {
    await session.abortTransaction()
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message || 'Something went wrong!')
  } finally {
    await session.endSession()
  }
}

// ? 3. Vehicle qoute:
const sendVehicleQoute = async (
  user: IUser,
  orderId: string,
  payload: TVehicleQouteRequestPayloadType
) => {
  const {
    model,
    year,
    pickupPrice,
    qoutedPrice,
    aluminumWeightLbs,
    batteryWeightLbs,
    breakageWeightLbs,
    weightLbs,
    wheelWeightLbs,
  } = payload

  // ?. Check is user rank greater than
  const userRole = user.role as 'superadmin' | 'admin' | 'customer' | 'staff'
  if (ROLE_RANK[userRole] <= ROLE_RANK.customer) {
    throw new AppError(httpStatus.BAD_REQUEST, "You don't have persmission to send qoute")
  }

  // ? Check is order exists :
  const existigOrder = await Order.findById(orderId)
  if (!existigOrder) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }

  // ? Check is order status pending?:
  if (existigOrder?.status !== OrderStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Qoute not allowed for "${existigOrder?.status}" order.`
    )
  }

  // Prepare session:
  const session = await mongoose.startSession()

  const totalPrice = Number(qoutedPrice) + Number(pickupPrice)
  try {
    await session.startTransaction()

    // ? Updated Order
    const updatedOrder = await Vehicle.findOneAndUpdate(
      {
        _id: existigOrder?._id,
      },
      {
        $set: {
          model,
          year,
          spcs: {
            aluminumWeightLbs: aluminumWeightLbs ?? 0,
            batteryWeightLbs: batteryWeightLbs ?? 0,
            breakageWeightLbs: breakageWeightLbs ?? 0,
            weightLbs: weightLbs ?? 0,
            wheelWeightLbs: wheelWeightLbs ?? 0,
          },
          subTotal: qoutedPrice,
          qoutedPrice,
          pickupPrice,
          totalPrice,
          status: OrderStatus.QOUTED,
        },
      },
      {
        new: true,
        session,
      }
    )

    if (!updatedOrder?._id) {
      throw new AppError(httpStatus.NOT_FOUND, 'Failed to update the order!')
    }

    // ? Update Order status:

    await OrderHistory.create(
      [
        {
          order: updatedOrder?._id,
          status: OrderStatus.QOUTED,
          previousStatus: existigOrder?.status,
          changedBy: user?._id,
          title: `Qouted Received`,
          note: `${user.name} has qouted your request for ${qoutedPrice}`,
        },
      ],
      { session }
    )

    await session.commitTransaction()

    return updatedOrder
  } catch (err: any) {
    await session.abortTransaction()
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message)
  } finally {
    await session.endSession()
  }
}
// ? 3. Metal qoute:
const sendMetalQoute = async (
  user: IUser,
  orderId: string,
  payload: TMetalQouteRequestPayloadType
) => {
  const { isCustom, qoutedPrice } = payload

  // ?. Check is user rank greater than
  const userRole = user.role as 'superadmin' | 'admin' | 'customer' | 'staff'
  if (ROLE_RANK[userRole] <= ROLE_RANK.customer) {
    throw new AppError(httpStatus.BAD_REQUEST, "You don't have persmission to send qoute")
  }

  // ? Check is order exists :
  const existigOrder = await MetalOrder.findById(orderId)
  if (!existigOrder) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }
  console.log(existigOrder, OrderType.METALS)

  // ? Validate order type:
  if (existigOrder.orderType !== OrderType.METALS) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Sorry! You may try to send qoute to vehicle order')
  }

  // ? Check is order status pending?:
  if (existigOrder?.status !== OrderStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Qoute not allowed for "${existigOrder?.status}" order.`
    )
  }

  // Prepare session:
  const session = await mongoose.startSession()

  let totalPrice = existigOrder.subTotal || 0
  let status = OrderStatus.ACCEPTED

  if (isCustom) {
    totalPrice = qoutedPrice as number
    status = OrderStatus.QOUTED
  }

  try {
    await session.startTransaction()

    // ? Updated Order
    const updatedOrder = await MetalOrder.findOneAndUpdate(
      {
        _id: existigOrder?._id,
      },
      {
        $set: {
          subTotal: existigOrder.subTotal,
          qoutedPrice: isCustom ? qoutedPrice : null,
          totalPrice,
          status,
        },
      },
      {
        new: true,
        session,
      }
    )

    if (!updatedOrder?._id) {
      throw new AppError(httpStatus.NOT_FOUND, 'Failed to update the order!')
    }

    // ? Update Order status:

    await OrderHistory.create(
      [
        {
          order: updatedOrder!._id,
          status,
          previousStatus: existigOrder?.status,
          changedBy: user?._id,
          title: status === OrderStatus.ACCEPTED ? 'Order Accepted' : `Qouted Received`,
          note:
            status === OrderStatus.ACCEPTED
              ? 'You order is accepted.'
              : `${user.name} has qouted your request for ${qoutedPrice || 0}`,
        },
      ],
      { session }
    )

    await session.commitTransaction()

    return updatedOrder
  } catch (err: any) {
    await session.abortTransaction()
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message)
  } finally {
    await session.endSession()
  }
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
  const result = await Order.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        localField: 'customer',
        foreignField: '_id',
        from: 'users',
        as: 'customerDetails',
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              phoneNumber: 1,
              address: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$customerDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        orderId: '$_id',
        customerId: '$customerDetails._id',
        customerName: '$customerDetails.name',
        customerEmail: '$customerDetails.email',
        customerPhone: '$customerDetails.phoneNumber',
        customerAddress: '$customerDetails.address',
      },
    },
    {
      $project: {
        _id: 0,
        customerDetails: 0,
      },
    },
  ])

  if (!result[0]) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found')
  }

  return result[0]
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
  getAllOrder,
  getOrderById,
  deleteOrderById,

  // Qoute request:
  sendVehicleQoute,
  sendMetalQoute,
}
