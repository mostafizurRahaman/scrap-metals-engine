/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AssignedEmployee,
  assignedEmployeeSearchableFields,
  AuthRoles,
  AuthStatus,
  ConversationUser,
  DeliveryMethod,
  employeeAssignStatus,
  employeeAssignStatusValues,
  Order,
  OrderChat,
  OrderChatStatus,
  OrderHistory,
  OrderStatus,
  User,
  Vehicle,
  type IUser,
  type TAssignEmployeeStatusType,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError, formatQuery, type BaseQueryParams } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateAssignedEmployeePayloadType,
  TGetAllAssignedEmployeeQueryParamsType,
  TCancelAssignedEmployeeByIdPayload,
} from './assigned-employee.validations'
import mongoose, { Types } from 'mongoose'

// ?. 1 Assign employee:
const createAssignedEmployee = async (user: IUser, payload: TCreateAssignedEmployeePayloadType) => {
  const { employee: employeeId, order: OrderId } = payload

  // ? Check  employee exists?.
  const employee = await User.findById(employeeId)

  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, "Employee doesn't exist.")
  }

  // ? Employee status:
  if (employee.status !== AuthStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Employee account is not active. Employee  status : "${employee.status}"`
    )
  }

  if (employee.role !== AuthRoles.STAFF) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You can assign only employee.')
  }

  // ? Check order status:
  const order = await Vehicle.findById(OrderId)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }

  // ? Check is delivery type is pickup type?
  if (order.deliveryType !== DeliveryMethod.PICKUP) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Not allowed employee assignment for dropoff!')
  }

  // ? Order status should be accepted ?:
  if (order.status !== OrderStatus.ACCEPTED) {
    throw new AppError(httpStatus.BAD_REQUEST, `Don't allow to assign the ${order.status} order`)
  }

  // ? Now check is employee already busy:
  const assignedTask = await AssignedEmployee.find({
    employee: employee?._id,
    status: {
      $in: [employeeAssignStatus.ACCEPTED, employeeAssignStatus.PENDING],
    },
  })

  if (assignedTask && Array.isArray(assignedTask) && assignedTask.length >= 2) {
    throw new AppError(httpStatus.BAD_REQUEST, `Employee is busy. Assign another employee.`)
  }

  const session = await mongoose.startSession()

  try {
    await session.startTransaction()

    // ? Update order for assignment
    const updatedOrder = await Vehicle.findOneAndUpdate(
      {
        _id: order?._id,
      },
      {
        $set: {
          status: OrderStatus.ASSIGNED,
          employee: employee?._id,
        },
      },
      {
        new: true,
        session,
      }
    )

    if (!updatedOrder) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to updated  order.')
    }

    // ? add assign employee record
    const [assignedEmployee] = await AssignedEmployee.create(
      [
        {
          employee: employee._id,
          order: order?._id,
          assignedAt: new Date(),
          status: employeeAssignStatus.PENDING,
        },
      ],
      { session }
    )

    if (!assignedEmployee) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to assign employee.')
    }

    // ? update order history record:
    await OrderHistory.create(
      [
        {
          order: updatedOrder?._id,
          status: OrderStatus.ASSIGNED,
          previousStatus: order?.status,
          changedBy: user?._id,
          title: `Employee assigned`,
          note: `Employee assigned to your request.`,
        },
      ],
      { session }
    )

    await session.commitTransaction()

    return assignedEmployee
  } catch (err: any) {
    await session.abortTransaction()
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message)
  } finally {
    await session.endSession()
  }
}

// ?. 2. Cancel assignment by id:
const cancelAssignmentById = async (
  user: IUser,
  assignedId: string,
  payload: TCancelAssignedEmployeeByIdPayload
) => {
  const { reason } = payload

  // 1. Check if assignment exists
  const assignment = await AssignedEmployee.findById(assignedId)
  if (!assignment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Assignment not found!')
  }

  // 2. Check assignment status
  if (assignment.status !== employeeAssignStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You cannot cancel this assignment. Assigned Status: "${assignment.status}"`
    )
  }

  // 3. Find order using the base 'Order' model (handles both Vehicles and Metals)
  const order = await Order.findById(assignment?.order)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }

  // 4. Verify order status
  if (order.status !== OrderStatus.ASSIGNED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You cannot cancel an order in "${order.status}" status.`
    )
  }

  // 5. Verify the assignment belongs to the current employee
  if (assignment?.employee?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'This assignment does not belong to you!')
  }

  const session = await mongoose.startSession()

  try {
    await session.startTransaction()

    // 6. Update order status and clear the assigned employee
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order?._id,
      },
      {
        $set: {
          status: OrderStatus.ACCEPTED,
          employee: null,
        },
      },
      {
        new: true,
        session,
      }
    )

    if (!updatedOrder) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update the order status.')
    }

    // 7. Mark assignment as cancelled
    const cancelledAssignment = await AssignedEmployee.findOneAndUpdate(
      {
        _id: assignment?._id,
      },
      {
        $set: {
          cancelledAt: new Date(),
          status: employeeAssignStatus.CANCELLED,
          cancelledReason: reason,
        },
      },
      {
        new: true,
        session,
      }
    )

    if (!cancelledAssignment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Failed to process assignment cancellation.')
    }

    // 8. Log state change in order history
    await OrderHistory.create(
      [
        {
          order: updatedOrder?._id,
          status: OrderStatus.ACCEPTED,
          previousStatus: order?.status,
          changedBy: user?._id,
          title: `Assignment Declined`,
          note: `Employee declined the assignment. Reason: ${reason || 'No reason provided'}. Order has been put back in the accepted queue.`,
        },
      ],
      { session }
    )

    await session.commitTransaction()
    return cancelledAssignment
  } catch (err: any) {
    await session.abortTransaction()
    // Propagate the specific AppError or throw internal server error for unexpected issues
    throw err instanceof AppError
      ? err
      : new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message || 'Something went wrong!')
  } finally {
    await session.endSession()
  }
}

// ? 3. Accept assignment:
const acceptAssignmentById = async (user: IUser, assignedId: string) => {
  // 1. Check if the assignment exists
  const assignment = await AssignedEmployee.findById(assignedId)
  if (!assignment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Assignment not found!')
  }

  // 2. Verify assignment status is still pending
  if (assignment.status !== employeeAssignStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `This assignment cannot be accepted. Status is currently: "${assignment.status}"`
    )
  }

  // 3. Verify order exists (polymorphic lookup using the base Order model)
  const order = await Order.findById(assignment?.order)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order doesn't exist.")
  }

  // 4. Ensure order is in ASSIGNED status
  if (order.status !== OrderStatus.ASSIGNED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot accept assignment because the order is in "${order.status}" status.`
    )
  }

  // 5. Verify the assignment belongs to the logged-in employee
  if (assignment?.employee?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'This assignment does not belong to you!')
  }

  const session = await mongoose.startSession()

  try {
    await session.startTransaction()

    // 6. Update the assignment to 'accepted' and record the timestamp
    const acceptedAssignment = await AssignedEmployee.findOneAndUpdate(
      { _id: assignment?._id },
      {
        $set: {
          status: employeeAssignStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      },
      { new: true, session }
    )

    if (!acceptedAssignment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Failed to update assignment status.')
    }

    // 7. Write to OrderHistory to log that the employee accepted
    await OrderHistory.create(
      [
        {
          order: order?._id,
          status: OrderStatus.ASSIGNED,
          previousStatus: OrderStatus.ASSIGNED,
          changedBy: user?._id,
          title: `Assignment Accepted`,
          note: `Employee ${user.name || 'assigned'} has accepted the assignment request.`,
        },
      ],
      { session }
    )

    // 8. Check if there is an active chat for this order
    const openedChat = await OrderChat.findOneAndUpdate(
      { order: order?._id },
      {
        order: order?._id,
        status: OrderChatStatus.ACTIVE,
      },
      { session, upsert: true, new: true }
    )

    if (!openedChat) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to initialize chat room.')
    }

    // 9. Filter out (active) the customer participant inside chat
    const customerParticipant = await ConversationUser.findOne({
      conversation: openedChat?._id,
      leftAt: null,
      role: AuthRoles.CUSTOMER,
    })
      .select({ user: 1, _id: 0 })
      .session(session)

    if (
      customerParticipant &&
      customerParticipant?.user?.toString() !== order?.customer?.toString()
    ) {
      throw new AppError(httpStatus.NOT_FOUND, 'Order & conversation customer id mismatched!')
    }

    if (!customerParticipant) {
      // Insert customer into chat
      await ConversationUser.create(
        [
          {
            conversation: openedChat?._id,
            user: order?.customer,
            role: AuthRoles.CUSTOMER,
            joinedAt: new Date(),
            lastReadAt: new Date(),
          },
        ],
        { session }
      )
    }

    // 10. OPTIMIZATION: Check if staff is already a participant to prevent duplicates/crashes
    const staffParticipant = await ConversationUser.findOne({
      conversation: openedChat?._id,
      user: user?._id,
      leftAt: null,
    }).session(session)

    if (!staffParticipant) {
      // Insert staff into chat if they aren't already there
      const chatStaffUser = await ConversationUser.create(
        [
          {
            conversation: openedChat?._id,
            user: user?._id,
            role: AuthRoles.STAFF,
            joinedAt: new Date(),
            lastReadAt: new Date(),
          },
        ],
        { session }
      )

      if (!chatStaffUser) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create staff user.')
      }
    }

    await session.commitTransaction()
    return acceptedAssignment
  } catch (err: any) {
    await session.abortTransaction()
    throw err instanceof AppError
      ? err
      : new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message || 'Something went wrong!')
  } finally {
    await session.endSession()
  }
}

// ? 4. Get all assignement of current employee:
const getAllAssignedEmployee = async (
  user: IUser,
  query: TGetAllAssignedEmployeeQueryParamsType
) => {
  const { status } = query

  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
    dateFilter,
    skip,
  } = formatQuery(query as BaseQueryParams)

  const pipeline: PipelineStage[] = [
    {
      $match: {
        employee: user?._id,
      },
    },
  ]

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
        localField: 'employee',
        foreignField: '_id',
        from: 'users',
        as: 'employeeDetails',
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              phoneNumber: 1,
              profileImage: 1,
              address: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        localField: 'order',
        foreignField: '_id',
        from: 'orders',
        as: 'orderDetails',
        pipeline: [
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
        ],
      },
    },
    {
      $unwind: {
        path: '$employeeDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$orderDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        assignmentId: '$_id',
        orderNumber: '$orderDetails.orderNumber',
        orderType: '$orderDetails.orderType',
        deliveryType: '$orderDetails.deliveryType',
        status: '$status',
        orderId: '$order',
        orderStatus: '$orderDetails.status',
        orderPlacedAt: '$orderDetails.orderRequestedAt',
        preferredDate: '$orderDetails.prefferredDate',
        pickupAddress: '$orderDetails.pickupAddress',
        subTotal: '$orderDetails.subTotal',
        qoutedPrice: '$orderDetails.qoutedPrice',
        pickupPrice: '$orderDetails.pickupPrice',
        totalPrice: '$orderDetails.totalPrice',
        customerId: '$orderDetails.customerDetails._id',
        customerProfileImage: '$orderDetails.customerDetails.profileImage',
        customerName: '$orderDetails.customerDetails.name',
        customerEmail: '$orderDetails.customerDetails.email',
        customerPhoneNumber: '$orderDetails.customerDetails.phoneNumber',
        customerAddress: '$orderDetails.customerDetails.address',
        employeeId: '$employeeDetails._id',
      },
    },
    {
      $project: {
        order: 0,
        orderDetails: 0,
        employeeDetails: 0,
      },
    }
  )

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: assignedEmployeeSearchableFields.map((field) => ({
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

  const aggregated = await AssignedEmployee.aggregate(pipeline)

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

const getAssignedEmployeeById = async (user: IUser, id: string) => {
  const result = await AssignedEmployee.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'AssignedEmployee not found')
  }

  if (user?._id?.toString() !== result?.employee?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This assign is not belong to you.')
  }
  const pipeline: PipelineStage[] = [
    {
      $match: {
        _id: new Types.ObjectId(id),
      },
    },
  ]

  pipeline.push(
    {
      $lookup: {
        localField: 'employee',
        foreignField: '_id',
        from: 'users',
        as: 'employeeDetails',
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              phoneNumber: 1,
              profileImage: 1,
              address: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        localField: 'order',
        foreignField: '_id',
        from: 'orders',
        as: 'orderDetails',
        pipeline: [
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
        ],
      },
    },
    {
      $unwind: {
        path: '$employeeDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$orderDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        orderId: '$_id',
        orderNumber: '$orderDetails.orderNumber',
        orderType: '$orderDetails.orderType',
        deliveryType: '$orderDetails.deliveryType',
        status: '$status',
        orderStatus: '$orderDetails.status',
        orderPlacedAt: '$orderDetails.orderRequestedAt',
        preferredDate: '$orderDetails.prefferredDate',
        pickupAddress: '$orderDetails.pickupAddress',
        attachments: '$orderDetails.attachments',
        vinNumber: '$orderDetails.vinNumber',
        model: '$orderDetails.model',
        year: '$orderDetails.year',
        items: '$orderDetails.items',
        specs: '$orderDetails.spcs',
        subTotal: '$orderDetails.subTotal',
        qoutedPrice: '$orderDetails.qoutedPrice',
        pickupPrice: '$orderDetails.pickupPrice',
        totalPrice: '$orderDetails.totalPrice',
        customerId: '$orderDetails.customerDetails._id',
        customerProfileImage: '$orderDetails.customerDetails.profileImage',
        customerName: '$orderDetails.customerDetails.name',
        customerEmail: '$orderDetails.customerDetails.email',
        customerPhoneNumber: '$orderDetails.customerDetails.phoneNumber',
        customerAddress: '$orderDetails.customerDetails.address',
        employeeId: '$employeeDetails._id',
      },
    },
    {
      $project: {
        employeeDetails: 0,
        orderDetails: 0,
      },
    }
  )

  const assignment = await AssignedEmployee.aggregate(pipeline)

  return assignment[0]
}

const getCurrentOngoingAssignment = async (user: IUser) => {
  const pipeline: PipelineStage[] = []

  pipeline.push(
    {
      $match: {
        employee: user?._id,
      },
    },
    {
      $lookup: {
        localField: 'order',
        foreignField: '_id',
        from: 'orders',
        as: 'orderDetails',
        pipeline: [
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
        ],
      },
    },
    {
      $lookup: {
        from: 'conversations',
        localField: '_id',
        foreignField: 'order',
        as: 'conversationDetails',
      },
    },
    {
      $unwind: {
        path: '$conversationDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$employeeDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$orderDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        orderId: '$_id',
        orderNumber: '$orderDetails.orderNumber',
        orderType: '$orderDetails.orderType',
        conversationId: { $ifNull: ['$conversationDetails._id', null] },
        deliveryType: '$orderDetails.deliveryType',
        status: '$status',
        orderStatus: '$orderDetails.status',
        orderPlacedAt: '$orderDetails.orderRequestedAt',
        preferredDate: '$orderDetails.prefferredDate',
        pickupAddress: '$orderDetails.pickupAddress',
        subTotal: '$orderDetails.subTotal',
        qoutedPrice: '$orderDetails.qoutedPrice',
        pickupPrice: '$orderDetails.pickupPrice',
        totalPrice: '$orderDetails.totalPrice',
        customerId: '$orderDetails.customerDetails._id',
        customerProfileImage: '$orderDetails.customerDetails.profileImage',
        customerName: '$orderDetails.customerDetails.name',
        customerEmail: '$orderDetails.customerDetails.email',
        customerPhoneNumber: '$orderDetails.customerDetails.phoneNumber',
        customerAddress: '$orderDetails.customerDetails.address',
        employeeId: '$employeeDetails._id',
      },
    },
    {
      $project: {
        orderDetails: 0,
        employeeDetails: 0,
      },
    },
    {
      $sort: {
        assignedAt: 1,
      },
    }
  )

  pipeline.push({
    $facet: {
      ongoing: [
        {
          $match: {
            status: employeeAssignStatus.ACCEPTED,
          },
        },
        {
          $limit: 1,
        },
      ],
      pending: [
        {
          $match: {
            status: employeeAssignStatus.PENDING,
          },
        },
        {
          $limit: 1,
        },
      ],
      statusStats: [
        {
          $group: {
            _id: '$status',
            count: {
              $sum: 1,
            },
          },
        },
      ],
    },
  })

  // ** Retrived all the order of the employee:
  const allAssignment = await AssignedEmployee.aggregate(pipeline)
  const ongoingAssignment = allAssignment?.[0]?.ongoing[0]
  const pendingAssignment = allAssignment?.[0]?.pending[0]
  const stats = allAssignment?.[0]?.statusStats ?? []

  const statusStats: Record<TAssignEmployeeStatusType, number> = {
    pending: 0,
    accepted: 0,
    cancelled: 0,
    completed: 0,
  }

  const statusMap: Map<TAssignEmployeeStatusType, number> = new Map()
  stats?.forEach((item: any) => statusMap.set(item._id, item.count))

  employeeAssignStatusValues.forEach((item) => {
    const val = statusMap.get(item) || 0
    statusStats[item as TAssignEmployeeStatusType] = val
  })

  return {
    overview: statusStats,
    ongoingAssignment: ongoingAssignment || null,
    pendingAssignment: pendingAssignment || null,
  }
}

export const assignedEmployeeServices = {
  createAssignedEmployee,
  cancelAssignmentById,

  // ? Accept the assignment:
  acceptAssignmentById,

  getAllAssignedEmployee,
  getAssignedEmployeeById,
  getCurrentOngoingAssignment,
  // getPendingAssignment,
}
