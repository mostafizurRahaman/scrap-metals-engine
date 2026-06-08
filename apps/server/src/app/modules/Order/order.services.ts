/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AssignedEmployee,
  AuthRoles,
  DeliveryMethod,
  employeeAssignStatus,
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
  type TAuthStatus,
  type TOrderStatusType,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError, formatQuery, ROLE_RANK, type BaseQueryParams } from '@repo/shared'
import mongoose, { Types, type PipelineStage } from 'mongoose'

import type {
  TCreateVihecleOrderPayloadType,
  TGetAllOrderQueryParamsType,
  TCreateMetalOrderPayloadType,
  TVehicleQouteRequestPayloadType,
  TMetalQouteRequestPayloadType,
} from './order.validations'
import { generateUniqueOrderNumber } from './order.utils'
import { uploadMultipleFileToS3 } from '@repo/media-hub'

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

// ? 4. Metal qoute:
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

// ? 5. Qoute Request Accept (customer)
const acceptQouteRequest = async (user: IUser, orderId: string) => {
  // ? Check is order exists :
  const existigOrder = await Order.findById(orderId)
  if (!existigOrder) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }

  // // ? Validate order type:
  // if (existigOrder.orderType !== OrderType.VEHICLE) {
  //   throw new AppError(httpStatus.BAD_REQUEST, `Only you can accept qoute for vehicle order.`)
  // }

  // ? Check is order status pending?:
  if (existigOrder?.status !== OrderStatus.QOUTED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Accept qoute not allowed for "${existigOrder?.status}" order.`
    )
  }

  // ? check is this  order belongs to this customer:
  if (existigOrder.customer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `You have no permission to accept this order!`)
  }

  // Prepare session:
  const session = await mongoose.startSession()

  try {
    await session.startTransaction()

    // ? Updated Order
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: existigOrder?._id,
      },
      {
        $set: {
          status: OrderStatus.ACCEPTED,
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
          order: updatedOrder._id,
          status: updatedOrder.status,
          previousStatus: existigOrder?.status,
          changedBy: user?._id,
          title: 'Order Accepted',
          note: 'You order is accepted.',
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

// ? 6. Cancel Order (Customer)
const cancelOrderById = async (user: IUser, orderId: string) => {
  // ? Check is order exists :
  const existingOrder = await Order.findById(orderId)
  if (!existingOrder) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }

  // ? Check is order status pending, qouted?:
  if (![OrderStatus.PENDING, OrderStatus.QOUTED].includes(existingOrder.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You cannot cancel "${existingOrder?.status}" status order.`
    )
  }

  // ? check is this  order belongs to this customer:
  if (existingOrder.customer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `You have no permission to cancel this order!`)
  }

  // Prepare session:
  const session = await mongoose.startSession()

  try {
    await session.startTransaction()

    // ? Updated Order
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: existingOrder?._id,
      },
      {
        $set: {
          status: OrderStatus.CANCELLED,
        },
      },
      {
        new: true,
        session,
      }
    )

    if (!updatedOrder?._id) {
      throw new AppError(httpStatus.NOT_FOUND, 'Failed to cancelled the order!')
    }

    // ? Update Order status:
    await OrderHistory.create(
      [
        {
          order: updatedOrder._id,
          status: updatedOrder.status,
          previousStatus: existingOrder?.status,
          changedBy: user?._id,
          title: 'Order Cancelled',
          note: 'Order cancelled by customer.',
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

// 7. Start on the way:
const startOnTheWay = async (user: IUser, orderId: string) => {
  // 1. Check if the assignment exists and is accepted by this employee
  const assignment = await AssignedEmployee.findOne({
    order: orderId,
    employee: user?._id,
    status: employeeAssignStatus.ACCEPTED,
  })

  if (!assignment) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'No accepted assignment found for this order and employee.'
    )
  }

  // 2. Check if the order itself exists and is currently ASSIGNED
  const order = await Order.findById(orderId)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }

  if (order.status !== OrderStatus.ASSIGNED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot start trip. The order status must be ASSIGNED, current status: "${order.status}"`
    )
  }

  const session = await mongoose.startSession()

  try {
    await session.startTransaction()

    // 3. Update the Order status to 'on_the_way'
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: OrderStatus.ASSIGNED,
      },
      {
        $set: {
          status: OrderStatus.ON_THE_WAY,
        },
      },
      {
        new: true,
        session,
      }
    )

    if (!updatedOrder) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update order status.')
    }

    // 4. Create an OrderHistory record
    await OrderHistory.create(
      [
        {
          order: updatedOrder._id,
          status: OrderStatus.ON_THE_WAY,
          previousStatus: OrderStatus.ASSIGNED,
          changedBy: user?._id,
          title: 'On the Way',
          note: `Employee ${user.name || ''} is on the way to process the order.`,
        },
      ],
      { session }
    )

    await session.commitTransaction()
    return updatedOrder
  } catch (err: any) {
    await session.abortTransaction()
    throw err instanceof AppError
      ? err
      : new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message || 'Something went wrong!')
  } finally {
    await session.endSession()
  }
}

// 8. Received order (staff)

const receiveOrder = async (user: IUser, orderId: string) => {
  // 1. Verify the employee has an active and accepted assignment for this order
  const assignment = await AssignedEmployee.findOne({
    order: orderId,
    employee: user?._id,
    status: employeeAssignStatus.ACCEPTED,
  })

  if (!assignment) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'No active assignment found for this order and employee.'
    )
  }

  // 2. Fetch the order
  const order = await Order.findById(orderId)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }

  // 3. Ensure the order is currently in ON_THE_WAY status
  if (order.status !== OrderStatus.ON_THE_WAY) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot mark as received. The order status must be ON_THE_WAY, current status: "${order.status}"`
    )
  }

  const session = await mongoose.startSession()

  try {
    await session.startTransaction()

    // 4. Update the Order status to RECEIVED
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: OrderStatus.ON_THE_WAY,
      },
      {
        $set: {
          status: OrderStatus.RECEIVED,
        },
      },
      {
        new: true,
        session,
      }
    )

    if (!updatedOrder) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update order status to received.')
    }

    // 5. Create an OrderHistory record
    await OrderHistory.create(
      [
        {
          order: updatedOrder._id,
          status: OrderStatus.RECEIVED,
          previousStatus: OrderStatus.ON_THE_WAY,
          changedBy: user?._id,
          title: 'Items Received',
          note: `Employee ${user.name || ''} has arrived and marked the items/vehicle as received.`,
        },
      ],
      { session }
    )

    await session.commitTransaction()
    return updatedOrder
  } catch (err: any) {
    await session.abortTransaction()
    throw err instanceof AppError
      ? err
      : new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message || 'Something went wrong!')
  } finally {
    await session.endSession()
  }
}

// 9. complete drop off order (admin, superadmin)
const completeDropoffOrder = async (user: IUser, orderId: string) => {
  const order = await Order.findById(orderId)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }

  // Ensure delivery type is drop_off
  if (order.deliveryType !== DeliveryMethod.DROPOFF) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This action is only allowed for drop-off type orders.'
    )
  }

  // Ensure the order is in a completable state (Accepted/Received by facility)
  if (![OrderStatus.ACCEPTED, OrderStatus.RECEIVED].includes(order.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot complete order. Status must be ACCEPTED or RECEIVED, current: "${order.status}"`
    )
  }

  const session = await mongoose.startSession()

  try {
    await session.startTransaction()

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id },
      { $set: { status: OrderStatus.COMPLETED } },
      { new: true, session }
    )

    if (!updatedOrder) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to complete drop-off order.')
    }

    // Record order history
    await OrderHistory.create(
      [
        {
          order: updatedOrder._id,
          status: OrderStatus.COMPLETED,
          previousStatus: order.status,
          changedBy: user?._id,
          title: 'Order Completed',
          note: `Drop-off order successfully processed and completed by Administrator ${user.name || ''}.`,
        },
      ],
      { session }
    )

    await session.commitTransaction()
    return updatedOrder
  } catch (err: any) {
    await session.abortTransaction()
    throw err instanceof AppError
      ? err
      : new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message)
  } finally {
    await session.endSession()
  }
}

// 10. complete pickup order: (staff)
const completePickupOrder = async (user: IUser, orderId: string) => {
  // Check active assignment for this staff
  const assignment = await AssignedEmployee.findOne({
    order: orderId,
    employee: user?._id,
    status: employeeAssignStatus.ACCEPTED,
  })

  if (!assignment) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have an active accepted assignment for this order.'
    )
  }

  const order = await Order.findById(orderId)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }

  // Ensure delivery type is pickup
  if (order.deliveryType !== DeliveryMethod.PICKUP) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This action is only allowed for pickup type orders.'
    )
  }

  // Ensure staff has marked it as RECEIVED before completing
  if (order.status !== OrderStatus.RECEIVED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot complete pickup order. Status must be RECEIVED, current: "${order.status}"`
    )
  }

  const session = await mongoose.startSession()

  try {
    await session.startTransaction()

    // Complete order
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id },
      { $set: { status: OrderStatus.COMPLETED } },
      { new: true, session }
    )

    if (!updatedOrder) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to complete order.')
    }

    // Complete assignment
    const updatedAssignment = await AssignedEmployee.findOneAndUpdate(
      { _id: assignment._id },
      {
        $set: {
          status: employeeAssignStatus.COMPLETED,
          completedAt: new Date(),
        },
      },
      { new: true, session }
    )

    if (!updatedAssignment) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to complete the employee assignment.')
    }

    // Record order history
    await OrderHistory.create(
      [
        {
          order: updatedOrder._id,
          status: OrderStatus.COMPLETED,
          previousStatus: order.status,
          changedBy: user?._id,
          title: 'Order Completed',
          note: `Pickup order picked up and completed by Employee ${user.name || ''}.`,
        },
      ],
      { session }
    )

    await session.commitTransaction()
    return updatedOrder
  } catch (err: any) {
    await session.abortTransaction()
    throw err instanceof AppError
      ? err
      : new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message)
  } finally {
    await session.endSession()
  }
}

const getCustomerAllOrder = async (user: IUser, query: TGetAllOrderQueryParamsType) => {
  const { status } = query
  console.log(status)
  const { page, limit, fromDate, toDate, dateFilter, searchTerm, skip, sortBy, sortOrder } =
    formatQuery(query as BaseQueryParams)

  const pipeline: PipelineStage[] = [
    {
      $match: {
        customer: user?._id,
      },
    },
  ]

  if (fromDate || toDate) {
    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (status) {
    const individualStatus = [
      OrderStatus.PENDING,
      OrderStatus.CANCELLED,
      OrderStatus.COMPLETED,
      OrderStatus.QOUTED,
    ]

    if (individualStatus.includes(status)) {
      pipeline.push({
        $match: {
          status,
        },
      })
    } else {
      pipeline.push({
        $match: {
          status: {
            $in: [
              OrderStatus.ACCEPTED,
              OrderStatus.ASSIGNED,
              OrderStatus.ON_THE_WAY,
              OrderStatus.RECEIVED,
            ],
          },
        },
      })
    }
  }

  pipeline.push(
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
      $lookup: {
        localField: 'employee',
        foreignField: '_id',
        from: 'users',
        as: 'employee',
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
        path: '$employee',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        orderId: '$_id',
        customerId: '$customerDetails._id',
        customerName: '$customerDetails.name',
        customerEmail: '$customerDetails.email',
        customerPhoneNumber: '$customerDetails.phoneNumber',
        customerAddress: '$customerDetails.address',
        employeeId: '$employee._id',
        employeeName: '$employee.name',
        employeeEmail: '$employee.email',
        employeePhoneNumber: '$employee.phoneNumber',
        employeeAddress: '$employee.address',
      },
    },
    {
      $project: {
        _id: 0,
        customerDetails: 0,
        employee: 0,
      },
    }
  )

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

const getAdminAllOrder = async (query: TGetAllOrderQueryParamsType) => {
  const { status } = query

  const { page, limit, fromDate, toDate, dateFilter, searchTerm, skip, sortBy, sortOrder } =
    formatQuery(query as BaseQueryParams)

  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (status) {
    pipeline.push({
      $match: {
        status,
      },
    })
  }

  pipeline.push(
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
      $lookup: {
        localField: 'employee',
        foreignField: '_id',
        from: 'users',
        as: 'employee',
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
        path: '$employee',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        orderId: '$_id',
        customerId: '$customerDetails._id',
        customerName: '$customerDetails.name',
        customerEmail: '$customerDetails.email',
        customerPhoneNumber: '$customerDetails.phoneNumber',
        customerAddress: '$customerDetails.address',
        employeeId: '$employee._id',
        employeeName: '$employee.name',
        employeeEmail: '$employee.email',
        employeePhoneNumber: '$employee.phoneNumber',
        employeeAddress: '$employee.address',
      },
    },
    {
      $project: {
        _id: 0,
        customerDetails: 0,
        employee: 0,
      },
    }
  )

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

// const deleteOrderById = async (id: string) => {
//   const result = await Order.findOneAndDelete({ _id: id })

//   if (!result) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Order not found')
//   }

//   return result
// }

export const orderServices = {
  createVehicleOrder,
  createMetalOrder,
  getCustomerAllOrder,
  getAdminAllOrder,
  getOrderById,
  // deleteOrderById,

  // Qoute request:
  sendVehicleQoute,
  sendMetalQoute,
  acceptQouteRequest,

  // Order Transitions
  startOnTheWay,
  receiveOrder,

  // Order completion
  completeDropoffOrder,
  completePickupOrder,

  // cancel order:
  cancelOrderById,
}
