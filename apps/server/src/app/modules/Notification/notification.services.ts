import { Notification, notificationSearchableFields, User, type INotification } from '@repo/db'
import type { PipelineStage } from 'mongoose'

import type { TGetAllNotificationQueryParamsType } from './notification.validations'
import { notificationUtils } from './notification.utils'

const createNotification = async (payload: INotification) => {
  const { receiver: receiverId, sender: senderId, title, message, notificationType, meta } = payload

  // ? Retrived receiver:
  const receiver = await User.findOne({ _id: receiverId })

  if (!receiver) return

  // ? Retrived receiver:
  const sender = await User.findOne({ _id: senderId })

  if (!sender) return

  // ?? Prepare notification meta:
  const notificationMeta = {
    ...meta,
    receiverId: receiver._id,
    receiverName: receiver.name,
    receiverProfileImg: receiver.profileImage || null,
    senderId: sender._id,
    senderName: sender.name,
    senderProfileImg: sender.profileImage || null,
  }

  const result = await Notification.create({
    receiver: receiver?._id,
    sender: sender._id,
    title,
    message,
    notificationType,
    meta,
  })

  // ?? Call push notification function:
  await notificationUtils.sendPushNotificaiton({
    receiver: receiver?._id,
    sender: sender._id,
    title,
    message,
    notificationType,
    meta: notificationMeta,
  })

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

export const notificationServices = {
  createNotification,
  getAllNotification,
}
