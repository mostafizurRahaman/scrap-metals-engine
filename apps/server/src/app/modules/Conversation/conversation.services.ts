import {
  Conversation,
  conversationSearchableFields,
  conversationType,
  ConversationUser,
  OrderChat,
  SupportChat,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError, formatQuery, type BaseQueryParams } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type { TGetAllConversationQueryParamsType } from './conversation.validations'
import mongoose from 'mongoose'

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

  const currentUserId = user?._id

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

  pipeline.push(
    {
      $lookup: {
        from: 'conversationusers',
        as: 'participants',
        let: {
          conversationId: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$$conversationId', '$conversation'],
              },
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
              _id: 0,
              participantId: '$_id',
              user: '$user',
              name: '$userDetails.name',
              email: '$userDetails.email',
              profileImage: { $ifNull: ['$userDetails.profileImage', null] },
              role: '$role',
              joinedAt: '$joinedAt',
              lastReadAt: '$lastReadAt',
              createdAt: '$createdAt',
            },
          },
        ],
      },
    },
    {
      $match: {
        'participants.user': currentUserId,
      },
    },
    {
      $addFields: {
        opponent: {
          $first: {
            $filter: {
              input: '$participants',
              as: 'p',
              cond: { $ne: ['$$p.user', currentUserId] },
            },
          },
        },
        own: {
          $first: {
            $filter: {
              input: '$participants',
              as: 'p',
              cond: { $eq: ['$$p.user', currentUserId] },
            },
          },
        },
      },
    }
  )

  pipeline.push({
    $lookup: {
      from: 'messages',
      let: {
        conversationId: '$_id',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$$conversationId', '$conversation'],
            },
          },
        },
        {
          $sort: {
            createdAt: 1,
          },
        },
      ],
      as: 'messages',
    },
  })

  // Final  projection :
  pipeline.push({
    $project: {
      conversationId: '$_id',
      type: '$type',
      orderId: '$order',
      status: '$status',
      opponentId: '$opponent.user',
      opponentName: '$opponent.name',
      opponentEmail: '$opponent.email',
      opponentRole: '$opponent.role',
      opponentProfileImg: '$opponent.profileImage',
      opponentJoinedAt: '$opponent.joinedAt',
      opponentLastReadAt: '$opponent.lastReadAt',
      ownId: '$own.user',
      ownLastReadAt: '$own.lastReadAt',
      unreadMessages: {
        $size: {
          $filter: {
            input: '$messages',
            as: 'm',
            cond: {
              $and: [
                { $ne: ['$$m.sender', currentUserId] },
                { $gt: ['$$m.createdAt', '$own.lastReadAt'] },
              ],
            },
          },
        },
      },
      lastMessage: {
        $last: '$messages',
      },
      createdAt: '$createdAt',
      updatedAt: '$updatedAt',
    },
  })

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: conversationSearchableFields.map((field) => ({
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

export const conversationServices = {
  getAllConversationOrderType,
  createOrGetSupport,
}
