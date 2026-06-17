import { Notification, notificationSearchableFields } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateNotificationPayloadType,
  TUpdateNotificationPayloadType,
  TGetAllNotificationQueryParamsType,
} from './notification.validations'

const createNotification = async (payload: TCreateNotificationPayloadType) => {
  const result = await Notification.create(payload)
  return result
}




const updateNotification = async (id: string, payload: TUpdateNotificationPayloadType) => {
  const result = await Notification.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found')
  }

  return result
}

const getAllNotification = async (query: TGetAllNotificationQueryParamsType) => {
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
        $or: notificationSearchableFields.map((field) => ({
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

  const aggregated = await Notification.aggregate(pipeline)

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

const getNotificationById = async (id: string) => {
  const result = await Notification.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found')
  }

  return result
}

const deleteNotificationById = async (id: string) => {
  const result = await Notification.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found')
  }

  return result
}

export const notificationServices = {
  createNotification,
  updateNotification,
  getAllNotification,
  getNotificationById,
  deleteNotificationById,
}
