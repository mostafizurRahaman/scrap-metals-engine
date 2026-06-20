import {
  AuthRoles,
  AuthStatus,
  employeeAssignStatus,
  User,
  userSearchableFields,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError, formatQuery, hashPassword, type BaseQueryParams } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateEmployeePayloadType,
  TGetAllEmployeeQueryParamsType,
} from './employee.validations'
import mongoose from 'mongoose'
import configs from '@app/configs'
import { AccountPasswordEmail, renderEmail } from 'packages/email-templates/src'
import { sendEmail } from 'packages/email-sender/src'
import { logger } from '@app/libs/logger'

const createEmployee = async (payload: TCreateEmployeePayloadType) => {
  const { name, email, password, phoneNumber, address, role } = payload

  // 1. Check existing user
  const existingUser = (await User.isUserExistByEmail(email)) as IUser

  if (existingUser) {
    switch (existingUser.status) {
      case AuthStatus.ACTIVE:
        throw new AppError(
          httpStatus.CONFLICT,
          'An account with this email already exists. Please log in.'
        )

      case AuthStatus.PENDING:
        throw new AppError(
          httpStatus.CONFLICT,
          'Your account is not verified yet. Please verify your OTP.'
        )

      case AuthStatus.BLOCKED:
        throw new AppError(
          httpStatus.FORBIDDEN,
          'Your account has been blocked. Please contact support.'
        )

      case AuthStatus.DELETED:
        throw new AppError(
          httpStatus.GONE,
          'This account was deleted. Please contact support to restore it.'
        )

      default:
        throw new AppError(httpStatus.CONFLICT, 'This user already have an account.')
    }
  }

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 2. Hash password
    const hashedPassword = await hashPassword(password, configs.passwordSoltRound)

    // 3. Upload images:
    const newUserPayload: Record<string, unknown> = {
      name,
      email,
      phoneNumber,
      address,
      password: hashedPassword,
      status: AuthStatus.ACTIVE,
      role,
      isOtpVerified: true,
    }

    // 3. Create user (ACTIVE)
    const [newUser] = await User.create([newUserPayload], { session })

    if (!newUser?._id) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User creation failed!')
    }

    // // 6. Render Signup Template:
    const htmlTemplate = await renderEmail(
      AccountPasswordEmail({
        role: newUser.role,
        password: password,
        loginUrl: '',
        companyName: configs.site.name,
      })
    )

    // // 7. Send OTP with rendered template
    await sendEmail({
      to: newUser.email,
      html: htmlTemplate.html,
      subject: 'Login Details for Your New Account',
    })

    await session.commitTransaction()
    session.endSession()

    return {
      name: newUser.name,
      email: newUser.email,
      password: '',
      status: newUser.status,
      role: newUser.role,
      isTwoFactorEnabled: newUser.isTwoFactorEnabled,
      isOtpVerified: newUser.isOtpVerified,
      _id: newUser?._id,
      createdAt: newUser?.createdAt,
      updatedAt: newUser?.updatedAt,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('Failed to create employee', error)
    await session.abortTransaction()
    throw new Error(error)
  }
}

const getAllEmployee = async (query: TGetAllEmployeeQueryParamsType) => {
  const { workingStatus, status } = query
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
        role: AuthRoles.STAFF,
      },
    },
  ]

  if (fromDate || toDate) {
    pipeline.push({ $match: { createdAt: dateFilter } })
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
        from: 'assignedemployees',
        localField: '_id',
        foreignField: 'employee',
        pipeline: [
          {
            $facet: {
              completed: [
                {
                  $match: {
                    status: employeeAssignStatus.COMPLETED,
                  },
                },
              ],
              ongoing: [
                {
                  $match: {
                    status: employeeAssignStatus.ACCEPTED,
                  },
                },
              ],
              pending: [
                {
                  $match: {
                    status: employeeAssignStatus.PENDING,
                  },
                },
              ],
              cancelled: [
                {
                  $match: {
                    status: employeeAssignStatus.CANCELLED,
                  },
                },
              ],
            },
          },
          {
            $project: {
              completedJob: { $size: '$completed' },
              ongoingJob: { $size: '$ongoing' },
              pendingJob: { $size: '$pending' },
              cancelledJob: { $size: '$cancelled' },
            },
          },
        ],
        as: 'assingnments',
      },
    },
    {
      $unwind: {
        path: '$assingnments',
        preserveNullAndEmptyArrays: true,
      },
    }
  )

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
      completedJob: '$assingnments.completedJob',
      ongoingJob: '$assingnments.ongoingJob',
      pendingJob: '$assingnments.pendingJob',
      cancelledJob: '$assingnments.cancelledJob',
      isBusy: {
        $gte: [{ $add: ['$assingnments.pendingJob', '$assingnments.ongoingJob'] }, 2],
      },
      joinedAt: '$createdAt',
    },
  })

  if (workingStatus) {
    const isBusy = workingStatus === 'busy'

    pipeline.push({
      $match: {
        isBusy,
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

export const employeeServices = {
  createEmployee,
  getAllEmployee,
}
