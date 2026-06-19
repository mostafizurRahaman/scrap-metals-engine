import httpStatus from 'http-status'
import {
  AuthRoles,
  Notification,
  notificationSearchableFields,
  User,
  type INotification,
  type IUser,
} from '@repo/db'
import { Types, type PipelineStage } from 'mongoose'

import type { TGetAllNotificationQueryParamsType } from './notification.validations'
import { notificationUtils } from './notification.utils'
import { AppError, formatQuery, type BaseQueryParams } from '@repo/shared'

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
    receiver: receiver._id,
    sender: sender._id,
    title,
    message,
    notificationType,
    meta: notificationMeta,
  })

  // ?? Call push notification function:
  await notificationUtils.sendPushNotification({
    receiver: receiver._id,
    sender: sender._id,
    title,
    message,
    notificationType,
    meta: notificationMeta,
  })

  return result
}

const createNotificationForAdmin = async (payload: Omit<INotification, 'receiver'>) => {
  const admins = await User.find({
    role: {
      $in: [AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN],
    },
  }).select({
    _id: 1,
  })

  if (!admins?.length) return []

  const adminNotifications: Promise<unknown>[] = []

  admins.forEach((admin) => {
    const notificationPayload = {
      ...payload,
      receiver: admin._id,
    }
    adminNotifications.push(createNotification(notificationPayload))
  })

  return Promise.all(adminNotifications)
}

const createNotificationForMultipleUser = async (
  payload: Omit<INotification, 'receiver'>,
  userIds: string[] = []
) => {
  if (!userIds?.length) return []

  const userNotifications: Promise<unknown>[] = []

  userIds.forEach((id) => {
    const notificationPayload = {
      ...payload,
      receiver: new Types.ObjectId(id),
    }
    userNotifications.push(createNotification(notificationPayload))
  })

  return Promise.all(userNotifications)
}

const markedAsRead = async (user: IUser, notificationId: string) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    receiver: user?._id,
  })

  // ? Check is the notification exists?:
  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found!')
  }

  notification.isRead = true

  await notification.save()

  return notification
}

const markedAsReadAll = async (user: IUser) => {
  user.lastReadAt = new Date()

  await user.save()

  return {
    message: 'All message marked as read',
  }
}

const getAllNotification = async (user: IUser, query: TGetAllNotificationQueryParamsType) => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    dateFilter,
    skip,
    fromDate,
    toDate,
  } = formatQuery(query as BaseQueryParams)

  const pipeline: PipelineStage[] = [
    {
      $match: {
        receiver: user?._id,
      },
    },
  ]

  if (fromDate || toDate) {
    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'sender',
      foreignField: '_id',
      as: 'senderDetails',
    },
  })
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'receiver',
      foreignField: '_id',
      as: 'receiverDetails',
    },
  })

  pipeline.push({
    $unwind: {
      path: '$senderDetails',
      preserveNullAndEmptyArrays: true,
    },
  })

  pipeline.push({
    $unwind: {
      path: '$receiverDetails',
      preserveNullAndEmptyArrays: true,
    },
  })

  pipeline.push({
    $addFields: {
      isRead: {
        $cond: [{ $lte: ['$createdAt', user?.lastReadAt] }, true, false],
      },
    },
  })

  pipeline.push({
    $project: {
      _id: 0,
      notificationId: '$_id',
      title: '$title',
      message: '$message',
      notificationType: '$notificationType',
      receiverId: '$receiver',
      receiverName: '$receiverDetails.name',
      receiverEmail: '$receiverDetails.email',
      receiverProfileImage: { $ifNull: ['$receiverDetails.profileImage', null] },
      senderId: '$receiver',
      senderName: '$senderDetails.name',
      senderEmail: '$senderDetails.email',
      senderProfileImage: { $ifNull: ['$senderDetails.profileImage', null] },
      isRead: '$isRead',
      meta: '$meta',
    },
  })

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
  createNotificationForAdmin,
  createNotificationForMultipleUser,
  getAllNotification,
  markedAsRead,
  markedAsReadAll,
}
