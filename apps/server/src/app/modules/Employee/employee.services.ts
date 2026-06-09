import { AuthStatus, User, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import { AppError, hashPassword } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateEmployeePayloadType,
  TUpdateEmployeePayloadType,
  TGetAllEmployeeQueryParamsType,
} from './employee.validations'
import mongoose from 'mongoose'
import configs from '@app/configs'
import { AccountPasswordEmail, renderEmail } from 'packages/email-templates/src'
import { sendEmail } from 'packages/email-sender/src'

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
  } catch (error: any) {
    await session.abortTransaction()
    session.endSession()
    console.log(error)
    throw new Error(error)
  }
}

const updateEmployee = async (id: string, payload: TUpdateEmployeePayloadType) => {
  const result = await Employee.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found')
  }

  return result
}

const getAllEmployee = async (query: TGetAllEmployeeQueryParamsType) => {
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
        $or: employeeSearchableFields.map((field) => ({
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

  const aggregated = await Employee.aggregate(pipeline)

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

const getEmployeeById = async (id: string) => {
  const result = await Employee.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found')
  }

  return result
}

const deleteEmployeeById = async (id: string) => {
  const result = await Employee.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found')
  }

  return result
}

export const employeeServices = {
  createEmployee,
  updateEmployee,
  getAllEmployee,
  getEmployeeById,
  deleteEmployeeById,
}
