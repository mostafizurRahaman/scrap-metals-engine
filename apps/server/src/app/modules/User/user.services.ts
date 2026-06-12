import { User, userSearchableFields, type IUser } from '@repo/db'
import { formatQuery, type BaseQueryParams } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type { TGetAllUserQueryParamsType } from './user.validations'

const getAllUser = async (user: IUser, query: TGetAllUserQueryParamsType) => {
  const { status } = query

  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortOrder,
    sortBy,
    fromDate,
    toDate,
    skip,
    dateFilter,
  } = formatQuery(query as BaseQueryParams)

  const pipeline: PipelineStage[] = [
    {
      $match: {
        _id: {
          $ne: user?._id,
        },
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

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: userSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $project: {
      _id: 1,
      profileImage: '$profileImage',
      name: '$name',
      email: '$email',
      phoneNumber: '$phoneNumber',
      address: '$address',
      status: '$status',
      role: '$role',
      joinedAt: '$createdAt',
    },
  })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await User.aggregate(pipeline)

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

export const userServices = {
  getAllUser,
}
