import {
  Conversation,
  conversationSearchableFields,
  ConversationUser,
  SupportChat,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
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

const getAllConversation = async (query: TGetAllConversationQueryParamsType) => {
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

  const aggregated = await Conversation.aggregate(pipeline)

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
  getAllConversation,
  createOrGetSupport,
}
