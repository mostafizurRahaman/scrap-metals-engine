/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AssignedEmployee,
  assignedEmployeeSearchableFields,
  AuthStatus,
  DeliveryMethod,
  employeeAssignStatus,
  OrderHistory,
  OrderStatus,
  User,
  Vehicle,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateAssignedEmployeePayloadType,
  TUpdateAssignedEmployeePayloadType,
  TGetAllAssignedEmployeeQueryParamsType,
} from './assigned-employee.validations'
import mongoose from 'mongoose'

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
  if (assignedTask && Array.isArray(assignedTask) && assignedTask.length < 1) {
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

const updateAssignedEmployee = async (id: string, payload: TUpdateAssignedEmployeePayloadType) => {
  const result = await AssignedEmployee.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'AssignedEmployee not found')
  }

  return result
}

const getAllAssignedEmployee = async (query: TGetAllAssignedEmployeeQueryParamsType) => {
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

const getAssignedEmployeeById = async (id: string) => {
  const result = await AssignedEmployee.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'AssignedEmployee not found')
  }

  return result
}

const deleteAssignedEmployeeById = async (id: string) => {
  const result = await AssignedEmployee.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'AssignedEmployee not found')
  }

  return result
}

export const assignedEmployeeServices = {
  createAssignedEmployee,
  updateAssignedEmployee,
  getAllAssignedEmployee,
  getAssignedEmployeeById,
  deleteAssignedEmployeeById,
}
