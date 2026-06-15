import {
  Conversation,
  conversationSearchableFields,
  conversationType,
  ConversationUser,
  Message,
  messageSearchableFields,
  OrderChat,
  SupportChat,
  supportConversationSearchableFields,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError, formatQuery, type BaseQueryParams } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TGetAllConversationQueryParamsType,
  TGetAllMessageByConversationIDQueryType,
} from './conversation.validations'
import mongoose, { Types } from 'mongoose'

const createOrGetSupport = async (user: IUser) => {
  const session = await mongoose.startSession()
  try {
    await session.startTransaction()
    // ? Check any support conversation exists for this user ? :
    const supportChat = await SupportChat.findOneAndUpdate(
      {
        user: user?._id,
        role: user?.role,
      },
      {
        user: user?._id,
        role: user?.role,
      },
      { session, new: true, upsert: true }
    )

    if (!supportChat) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create support.')
    }

    await ConversationUser.findOneAndUpdate(
      {
        user: user?._id,
        conversation: supportChat._id,
      },
      {
        $set: {
          user: user?._id,
          conversation: supportChat._id,
          role: user?.role,
          joinedAt: new Date(),
          lastReadAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        session,
      }
    )

    await session.commitTransaction()
    return supportChat
  } catch (error) {
    console.log(error)
    await session.abortTransaction()
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal server error!')
  } finally {
    await session.endSession()
  }
}

const getAllConversationOrderType = async (
  user: IUser,
  query: TGetAllConversationQueryParamsType
) => {
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

  const currentUserId = user?._id ? new Types.ObjectId(user._id) : null
  if (!currentUserId) {
    return { data: [], meta: { page, limit, total: 0, totalPages: 1 } }
  }

  // 1. Initial Filtering (Narrow down dataset as early as possible)
  const pipeline: PipelineStage[] = [
    {
      $match: {
        type: conversationType.OrderChat,
      },
    },
  ]

  if (fromDate || toDate) {
    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  // 2. Simplified Lookup for Participants (Replaced $expr with local/foreign fields for index utilization)
  pipeline.push(
    {
      $lookup: {
        from: 'conversationusers',
        localField: '_id',
        foreignField: 'conversation',
        as: 'participants',
      },
    },
    {
      $match: {
        'participants.user': currentUserId,
      },
    }
  )

  // 3. Extract Own and Opponent participant details before doing nested lookups
  pipeline.push({
    $addFields: {
      opponentParticipant: {
        $first: {
          $filter: {
            input: '$participants',
            as: 'p',
            cond: { $ne: ['$$p.user', currentUserId] },
          },
        },
      },
      ownParticipant: {
        $first: {
          $filter: {
            input: '$participants',
            as: 'p',
            cond: { $eq: ['$$p.user', currentUserId] },
          },
        },
      },
    },
  })

  // 4. Look up Opponent User Details (Only for the single opponent user)
  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'opponentParticipant.user',
        foreignField: '_id',
        as: 'opponentDetails',
      },
    },
    {
      $unwind: {
        path: '$opponentDetails',
        preserveNullAndEmptyArrays: true,
      },
    }
  )

  // 5. Optimized Lookups for Messages (Avoids loading entire chat histories into memory)
  pipeline.push(
    {
      $lookup: {
        from: 'messages',
        let: { conversationId: '$_id', ownLastRead: '$ownParticipant.lastReadAt' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$conversation', '$$conversationId'] },
                  { $ne: ['$sender', currentUserId] },
                  { $gt: ['$createdAt', '$$ownLastRead'] },
                ],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'unreadCountArray',
      },
    },
    {
      $lookup: {
        from: 'messages',
        let: { conversationId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$conversation', '$$conversationId'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: 'lastMessageArray',
      },
    }
  )

  // 6. Flat Projection
  pipeline.push({
    $project: {
      conversationId: '$_id',
      type: '$type',
      orderId: '$order',
      status: '$status',
      opponentId: '$opponentParticipant.user',
      opponentName: '$opponentDetails.name',
      opponentEmail: '$opponentDetails.email',
      opponentRole: '$opponentParticipant.role',
      opponentProfileImg: { $ifNull: ['$opponentDetails.profileImage', null] },
      opponentJoinedAt: '$opponentParticipant.joinedAt',
      opponentLastReadAt: '$opponentParticipant.lastReadAt',
      ownId: '$ownParticipant.user',
      ownLastReadAt: '$ownParticipant.lastReadAt',
      unreadMessages: {
        $ifNull: [{ $first: '$unreadCountArray.count' }, 0],
      },
      lastMessage: {
        $first: '$lastMessageArray',
      },
      createdAt: '$createdAt',
      updatedAt: '$updatedAt',
    },
  })

  // 7. Search Filter (Applied to computed projection fields)
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: conversationSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  // 8. Sorting
  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  // 9. Faceted Pagination
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await OrderChat.aggregate(pipeline)

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

const getAllSupportConversationForAdmin = async (
  user: IUser,
  query: TGetAllConversationQueryParamsType
) => {
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

  const currentUserId = user?._id

  // 1. Initial Filtering (Narrow down dataset as early as possible)
  const pipeline: PipelineStage[] = [
    {
      $match: {
        type: conversationType.SUPPORT,
      },
    },
  ]

  if (fromDate || toDate) {
    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  // 2.  Get participants for this conversation:
  pipeline.push({
    $lookup: {
      from: 'conversationusers',
      localField: '_id',
      foreignField: 'conversation',
      as: 'participants',
    },
  })

  // 3. Get requester information:
  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'requesterDetails',
      },
    },
    {
      $unwind: {
        path: '$requesterDetails',
        preserveNullAndEmptyArrays: true,
      },
    }
  )

  // 4. Differentiate the participants:
  pipeline.push({
    $addFields: {
      ownParticipant: {
        $first: {
          $filter: {
            input: '$participants',
            as: 'p',
            cond: { $eq: ['$$p.user', currentUserId] },
          },
        },
      },
    },
  })

  // 4. Get all messages and unread count:
  pipeline.push({
    $lookup: {
      from: 'messages',
      let: { conversationId: '$_id', ownLastRead: '$ownParticipant.lastReadAt' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$conversation', '$$conversationId'] },
                { $ne: ['$sender', currentUserId] },
                { $gt: ['$createdAt', '$$ownLastRead'] },
              ],
            },
          },
        },
        { $count: 'count' },
      ],
      as: 'unreadCountArray',
    },
  })

  pipeline.push({
    $lookup: {
      from: 'messages',
      let: {
        conversationId: '$_id',
        userId: currentUserId,
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [{ $eq: ['$$conversationId', '$conversation'] }],
            },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $limit: 1,
        },
      ],
      as: 'lastMessageArray',
    },
  })

  pipeline.push({
    $project: {
      _id: 0,
      conversationId: '$_id',
      conversationType: '$type',
      requsterId: '$requesterDetails._id',
      requesterName: '$requesterDetails.name',
      requesterEmail: '$requesterDetails.email',
      requesterRole: '$requesterDetails.role',
      requesterProfileImage: {
        $ifNull: ['$requesterDetails.profileImage', null],
      },

      ownId: '$ownParticipant.user',
      ownLastReadAt: '$ownParticipant.lastReadAt',
      ownJoinedAt: '$ownParticipant.joinedAt',
      unreadMessages: {
        $ifNull: [{ $first: '$unreadCountArray.count' }, 0],
      },
      lastMessage: {
        $first: '$lastMessageArray',
      },
      createdAt: '$createdAt',
      updatedAt: '$updatedAt',
    },
  })

  // 7. Search Filter (Applied to computed projection fields)
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: supportConversationSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  // 8. Sorting
  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  // 9. Faceted Pagination
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await SupportChat.aggregate(pipeline)

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

const getAllMessages = async (
  user: IUser,
  conversationId: string,
  query: TGetAllMessageByConversationIDQueryType
) => {
  const { page, limit, skip, fromDate, toDate, dateFilter, searchTerm, sortBy, sortOrder } =
    formatQuery(query as BaseQueryParams)

  // 1. Check is conversation exists?:
  const conversation = await Conversation.findOne({ _id: new Types.ObjectId(conversationId) })
  if (!conversation) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Conversation not found!')
  }

  // 2. Check is this user is a member of this conversation:
  const participants = await ConversationUser.find({
    conversation: conversation?._id,
  })

  if (!participants || !Array.isArray(participants) || participants.length < 1) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You are not a member of this conversation.')
  }

  const converstaionUsers = await ConversationUser?.aggregate([
    {
      $match: {
        conversation: conversation?._id,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    {
      $unwind: {
        path: '$userDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        userId: '$userDetails._id',
        name: '$userDetails.name',
        joinedAt: '$joinedAt',
        lastReadAt: '$lastReadAt',
        profileImage: { $ifNull: ['$userDetails.profileImage', null] },
      },
    },
  ])

  // Check is there any one matched with current user:
  const isMember = participants.find((p) => p.user?.toString() === user?._id?.toString())

  if (!isMember) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You are not a member of this conversation.')
  }

  // 1. Initial Filtering (Narrow down dataset as early as possible)
  const pipeline: PipelineStage[] = [
    {
      $match: {
        conversation: conversation?._id,
      },
    },
  ]

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'sender',
        foreignField: '_id',
        as: 'senderDetails',
      },
    },
    {
      $unwind: {
        path: '$senderDetails',
        preserveNullAndEmptyArrays: true,
      },
    }
  )

  if (fromDate || toDate) {
    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  pipeline.push({
    $project: {
      messageId: '$_id',
      conversationId: '$conversation',
      text: '$text',
      attachments: '$attachments',
      senderId: '$sender',
      senderName: '$senderDetails.name',
      senderProfileImge: { $ifNull: ['$senderDetails.profileImage', null] },
      createdAt: '$createdAt',
      updatedAt: '$updatedAt',
    },
  })

  // 7. Search Filter (Applied to computed projection fields)
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: messageSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  // 8. Sorting
  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  // 9. Faceted Pagination
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await Message.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0

  return {
    data: {
      participants: converstaionUsers || [],
      messages: data,
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

export const conversationServices = {
  getAllConversationOrderType,
  createOrGetSupport,
  getAllSupportConversationForAdmin,
  getAllMessages,
}
