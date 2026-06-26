/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AuthRoles,
  AuthStatus,
  FcmToken,
  Otp,
  otpTypes,
  User,
  type IUser,
  type TAuthStatus,
} from '@repo/db'
import type {
  IChangedPasswordType,
  IForgotPasswordType,
  ILoginType,
  ILogoutPayload,
  IResendSignupType,
  IResetPasswordOtpType,
  ISignUpSchemaType,
  IUpdateProfilePayloadType,
  IVerifyResetPasswordOtpType,
  IVerifySignupOtpType,
} from './user.validations'
import {
  addTime,
  AppError,
  comparePassword,
  createToken,
  generateOtp,
  hashPassword,
  ROLE_RANK,
  verifyToken,
  type IJwtUserPayload,
} from '@repo/shared'
// import { sendEmail } from '@repo/email-sender'
import httpStatus from 'http-status'
import configs from '@app/configs'
import mongoose, { Types } from 'mongoose'
import { renderEmail, ResetPasswordOTPEmail, SignupOTPEmail } from '@repo/email-templates'
import { sendEmail } from '@repo/email-sender'
import { deleteSingleFileFromS3, uploadSingleFileToS3 } from '@repo/media-hub'

// 1. Signup
const signUp = async (payload: ISignUpSchemaType, file: Express.Multer.File) => {
  const { name, email, password, phoneNumber, address } = payload

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
        throw new AppError(httpStatus.CONFLICT, 'You already have an account.')
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
      status: AuthStatus.PENDING,
      role: AuthRoles.CUSTOMER,
    }

    // 4. Upload Profile image:
    if (file) {
      const { url } = await uploadSingleFileToS3(file, 'profileImages')
      if (url) {
        newUserPayload.profileImage = url
      }
    }

    // 3. Create user (PENDING)
    const [newUser] = await User.create([newUserPayload], { session })

    if (!newUser?._id) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User creation failed!')
    }

    // 4. Generate OTP
    const otp = generateOtp({ length: configs.otpSettings.digits })

    // 5. Create OTP:
    const [savedOtp] = await Otp.create(
      [
        {
          user: newUser._id.toString(),
          type: otpTypes.SIGNUP,
          otp,
          expiresAt: addTime(configs.otpSettings.expiresIn, 'minutes', true),
        },
      ],
      { session }
    )

    // 6. Render Signup Template:
    const htmlTemplate = await renderEmail(
      SignupOTPEmail({
        userFirstName: name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: savedOtp?.otp as string,
      })
    )

    await session.commitTransaction()
    session.endSession()

    // 7. Send OTP with rendered template
    sendEmail({
      to: newUser.email,
      html: htmlTemplate.html,
      subject: 'Your OTP for Account Verification',
    })

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
    throw new Error(error)
  }
}

// 2. Resend Signup otp:
const resendSignupOTP = async (payload: IResendSignupType) => {
  const { email } = payload

  // 1. Check existing user
  const user = (await User.isUserExistByEmail(email)) as IUser
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User Doesn't exits!`)
  }

  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account has been blocked. Please contact support.'
    )
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(
      httpStatus.GONE,
      'This account was deleted. Please contact support to restore it.'
    )
  }

  if (user.isOtpVerified) {
    throw new AppError(httpStatus.CONFLICT, 'Your account already verified!')
  }

  // 2. Check Otp exists ? :
  const existingOtp = await Otp.findValidOtp(user._id?.toString(), otpTypes.SIGNUP)

  // 3. If existing otp still valid resend otp:
  if (existingOtp) {
    // Render Signup Template:
    const htmlTemplate = await renderEmail(
      SignupOTPEmail({
        userFirstName: user.name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: existingOtp?.otp as string,
      })
    )

    //  Send OTP with rendered template
    sendEmail({
      to: user.email,
      html: htmlTemplate.html,
      subject: 'Your OTP for Account Verification',
    })

    throw new AppError(
      httpStatus.BAD_REQUEST,
      'An OTP has already been sent and is still valid. Please check your email or wait for it to expire.'
    )
  }

  // 4. Generate new otp:
  const newOtp = generateOtp({ length: 6 })

  // 5. Create OTP:
  const savedOtp = await Otp.findOneAndUpdate(
    {
      user: user._id.toString(),
      type: otpTypes.SIGNUP,
    },
    {
      user: user._id.toString(),
      type: otpTypes.SIGNUP,
      otp: newOtp,
      expiresAt: addTime(configs.otpSettings.expiresIn, 'minutes', true),
    },
    {
      new: true,
    }
  )

  // 6. Render Signup Template:
  const htmlTemplate = await renderEmail(
    SignupOTPEmail({
      userFirstName: user.name,
      companyName: configs.site.name,
      companyLogo: configs.site.logo as string,
      otpCode: savedOtp?.otp as string,
    })
  )

  // 7. Send OTP with rendered template
  sendEmail({
    to: user.email,
    html: htmlTemplate.html,
    subject: 'Your OTP for Account Verification',
  })

  return {
    geneated: true,
  }
}

// 3. verify signup otp:
const verifySignupOTP = async (payload: IVerifySignupOtpType) => {
  const { email, otp } = payload

  //  1. check is email exits with this email:
  const user = await User.isUserExistByEmail(email)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exists!`)
  }

  // 2. check the status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account has been blocked. Please contact support.'
    )
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(
      httpStatus.GONE,
      'This account was deleted. Please contact support to restore it.'
    )
  }

  // 3. Is already otp verified :
  if (user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `You account already verified!`)
  }

  // 4. Find valid otp:
  const validOtp = await Otp.verifyAndConsumeOtp(user?._id?.toString(), otpTypes.SIGNUP, otp)

  if (!validOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid otp!')
  }

  user.isOtpVerified = true
  user.status = AuthStatus.ACTIVE
  await user.save()
}

// 4. Login :
const login = async (payload: ILoginType) => {
  const { email, password } = payload

  // 1. check user
  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  // 2. check user status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'You account is blocked. Please contact support!')
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, 'Your account is deleted!')
  }

  // 3. check is in review or not ? if documents required

  // 4. check is otp verified ?
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your account is not verified!')
  }

  // 5. compare given password:
  const isPasswordMatched = await comparePassword(password, user.password)

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Credential not matched!')
  }

  // 6. Prepare jwt payload:
  const jwtPayload: IJwtUserPayload = {
    _id: user._id?.toString(),
    email: user?.email,
    name: user?.name,
    profileImage: user?.profileImage as string,
    status: user?.status,
  }

  // 7. Generate access token :
  const accessToken = createToken(
    jwtPayload,
    configs.jwt.accessToken.secret,
    configs.jwt.accessToken.expiresIn
  )

  // 8. Generate refresh token
  const refreshToken = createToken(
    jwtPayload,
    configs.jwt.refreshToken.secret,
    configs.jwt.refreshToken.expiresIn
  )

  return {
    refreshToken,
    accessToken,
    email: user.email,
    isTwofactorEnabled: user.isTwoFactorEnabled,
    role: user?.role,
  }
}

// 5. Forgot password
const forgotPassword = async (payload: IForgotPasswordType) => {
  const { email } = payload
  // 1. check user
  const user = await User.findOne({ email })
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  // 2. check user status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'You account is blocked. Please contact support!')
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, 'Your account is deleted!')
  }

  // 3. check is otp verified ?
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your account is not verified!')
  }

  // 4. Has valid otp for reset password :
  const exitingOtp = await Otp.findValidOtp(user._id.toString(), otpTypes.RESET)
  if (exitingOtp) {
    throw new AppError(httpStatus.TOO_MANY_REQUESTS, 'Please wait before requesting another OTP')
  } else {
    // 8. Generate new otp
    const newOtp = generateOtp({
      length: configs.otpSettings.digits,
    })

    // 9. Store reset password otp:
    const otp = await Otp.findOneAndUpdate(
      {
        user: user?._id?.toString(),
        type: otpTypes.RESET,
      },
      {
        user: user?._id?.toString(),
        type: otpTypes.RESET,
        expiresAt: addTime(configs.otpSettings.expiresIn, 'minutes'),
        otp: newOtp,
      },
      {
        new: true,
        upsert: true,
      }
    )

    // 6. Render Reset password otp template:
    const htmlTemplate = await renderEmail(
      ResetPasswordOTPEmail({
        userFirstName: user.name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: otp?.otp as string,
      })
    )

    // 7. Send OTP with rendered template
     sendEmail({
      to: user.email,
      html: htmlTemplate.html,
      subject: 'OTP for reset password!',
    })
  }
}

// 6. Verify Reset password otp:
const verifyResetPasswordOtp = async (payload: IVerifyResetPasswordOtpType) => {
  const { email, otp } = payload

  // 1. check user
  const user = await User.findOne({ email })
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  // 2. check user status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'You account is blocked. Please contact support!')
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, 'Your account is deleted!')
  }

  // 3. check is otp verified ?
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your account is not verified!')
  }

  // 4. Find valid otp:
  const validOtp = await Otp.verifyAndConsumeOtp(user?._id?.toString(), otpTypes.RESET, otp)

  if (!validOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid otp!')
  }

  // 5. Reset token payload:
  const resetTokenPayload = {
    _id: user?._id?.toString(),
    email: user.email,
    name: user.name,
    profileImage: user.profileImage as string,
    status: user.status,
  }

  // 5. Reset password token:
  const resetToken = createToken(
    resetTokenPayload,
    configs.jwt.resetToken.secret,
    configs.jwt.resetToken.expiresIn
  )

  return {
    resetToken,
  }
}

// 7. Resend Signup otp:
const resendOTP = async (payload: IResendSignupType) => {
  const { email } = payload

  // 1. Check existing user
  const user = (await User.isUserExistByEmail(email)) as IUser
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User Doesn't exits!`)
  }

  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account has been blocked. Please contact support.'
    )
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(
      httpStatus.GONE,
      'This account was deleted. Please contact support to restore it.'
    )
  }

  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.CONFLICT, 'Your account is not verified yet!')
  }

  // 2. Check Otp exists ? :
  const existingOtp = await Otp.findValidOtp(user._id?.toString(), otpTypes.RESET)

  // 3. If existing otp still valid resend otp:
  if (existingOtp) {
    // Render Signup Template:
    const htmlTemplate = await renderEmail(
      ResetPasswordOTPEmail({
        userFirstName: user.name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: existingOtp?.otp as string,
      })
    )

    //  Send OTP with rendered template
     sendEmail({
      to: user.email,
      html: htmlTemplate.html,
      subject: 'OTP for reset password!',
    })

    throw new AppError(
      httpStatus.BAD_REQUEST,
      'An OTP has already been sent and is still valid. Please check your email or wait for it to expire.'
    )
  }

  // 4. Generate new otp:
  const newOtp = generateOtp({ length: 6 })

  // 5. Create OTP:
  const savedOtp = await Otp.findOneAndUpdate(
    {
      user: user._id.toString(),
      type: otpTypes.RESET,
    },
    {
      user: user._id.toString(),
      type: otpTypes.RESET,
      otp: newOtp,
      expiresAt: addTime(configs.otpSettings.expiresIn, 'minutes', true),
    },
    {
      new: true,
    }
  )

  // 6. Render Signup Template:
  const htmlTemplate = await renderEmail(
    ResetPasswordOTPEmail({
      userFirstName: user.name,
      companyName: configs.site.name,
      companyLogo: configs.site.logo as string,
      otpCode: savedOtp?.otp as string,
    })
  )

  // 7. Send OTP with rendered template
   sendEmail({
    to: user.email,
    html: htmlTemplate.html,
    subject: 'OTP for reset password!',
  })

  return {
    geneated: true,
  }
}

// 8. Reset password :
const resetPassword = async (resetToken: string, payload: IResetPasswordOtpType) => {
  const { newPassword } = payload

  // 1. Decode the reset token:
  const decoded = verifyToken(resetToken, configs.jwt.resetToken.secret)
  if (!decoded.email) {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid Token!')
  }

  // 2. Find user with this email:
  const user = await User.findOne({ email: decoded.email }).select('+password')
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exits!")
  }

  // 3. Check user status :
  if (await User.isUserBlocked(user)) {
    throw new AppError(httpStatus.FORBIDDEN, 'You account is blocked. Please contact support!')
  }

  if (await User.isUserDeleted(user)) {
    throw new AppError(httpStatus.GONE, 'Your account is deleted!')
  }

  // 4. Compare if JWT was issued before password change:
  if (
    await User.isJwtIssuedBeforePasswordChanged(
      user.passwordChangedAt as Date,
      decoded.iat as number
    )
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your session has expired.')
  }

  // 4. Hash password:
  const hashedPassword = await hashPassword(newPassword, configs.passwordSoltRound)

  // 5. Update user password:
  await User.findOneAndUpdate(
    {
      _id: user?._id,
    },
    {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    }
  )

  return
}

// 9. Changed password:
const changedPassword = async (userInfo: IUser, payload: IChangedPasswordType) => {
  const { newPassword, oldPassword } = payload

  // 1. Check is user exists with this id?:
  const user = await User.findById(userInfo._id).select('+password')
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  // 2. Compare old password to password hash:
  const isPasswordMatched = await comparePassword(oldPassword, user.password)
  if (!isPasswordMatched) {
    throw new AppError(httpStatus.CONFLICT, 'Password not matched!')
  }

  // 3. Hash new password:
  const hashedPassword = await hashPassword(newPassword, configs.passwordSoltRound)

  // 4. Update password now:
  await User.findOneAndUpdate(
    {
      _id: user._id,
    },
    {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    },
    {
      new: true,
    }
  )
}

// 10. Get me:
const getMe = async (user: IUser) => {
  // check is the user exists?:

  const me = await User.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(user._id),
      },
    },

    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        phoneNumber: 1,
        status: 1,
        role: 1,
        address: 1,
        isTwoFactorEnabled: 1,
        profileImage: 1,
        isOtpVerified: 1,
        passwordChangedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ])

  return me[0]
}

// 12. Update Profile data:
const updateProfile = async (
  user: IUser,
  body: IUpdateProfilePayloadType,
  file: Express.Multer.File
) => {
  if (user.profileImage && file) {
    await deleteSingleFileFromS3(user.profileImage)
  }

  if (file) {
    const { url } = await uploadSingleFileToS3(file, 'profileImage')
    user.profileImage = url
  }

  if (body.name !== undefined) user.name = body.name
  if (body.address !== undefined) user.address = body.address
  if (body.phoneNumber !== undefined) user.phoneNumber = body.phoneNumber

  user.save()

  return {
    _id: user?._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    address: user.address,
    updatedAt: user.updatedAt,
  }
}

// 13: Update User Status:
const updateUserStatusById = async (actorUser: IUser, userId: string, status: string) => {
  if (!actorUser) {
    throw new AppError(httpStatus.NOT_FOUND, "You don't have an account!")
  }

  // 1. Check is user is exists ?
  const user = await User.findOne({
    _id: userId,
  })

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists")
  }

  // 2. Check is user otp verified ?:
  if (!user?.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User doesn't verify OTP yet.`)
  }

  // 3. Check user id and current user is same ?:
  if (user?._id?.toString() === actorUser?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot change your status.')
  }

  // 4. Rank validation for chaning status:

  const actorRole = actorUser.role as 'superadmin' | 'admin' | 'customer' | 'staff'
  const userRole = user.role as 'superadmin' | 'admin' | 'customer' | 'staff'

  const canChangeStatus = ROLE_RANK[actorRole] > ROLE_RANK[userRole]

  if (!canChangeStatus) {
    throw new AppError(httpStatus.BAD_REQUEST, "You don't have enough permission to change status.")
  }

  // 5. Check status already changed:
  if (user.status === status) {
    throw new AppError(httpStatus.BAD_REQUEST, `User status already changed to ${user.status}`)
  }

  user.status = status as TAuthStatus

  user.save()

  return {
    _id: user?._id,
    status: user?.status,
    createdAt: user?.createdAt,
    updatedAt: user?.updatedAt,
  }
}

// 14. Change profile picture:
const ChangeProfilePicture = async (user: IUser, file: Express.Multer.File) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File is required!')
  }

  if (user.profileImage) {
    await deleteSingleFileFromS3(user.profileImage)
  }

  const { url } = await uploadSingleFileToS3(file, 'profileImage')
  user.profileImage = url

  user.save()

  return {
    _id: user?._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    profileImage: user.profileImage,
    address: user.address,
    updatedAt: user.updatedAt,
  }
}

const adminLogin = async (payload: ILoginType) => {
  const { email, password } = payload

  // 1. check user
  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  // 2. check user status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'You account is blocked. Please contact support!')
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, 'Your account is deleted!')
  }

  // 3. check is in review or not ? if documents required

  // 4. check is otp verified ?
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your account is not verified!')
  }

  // 4.1 : Check is this user admin/ super_admin:
  if (![AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN].includes(user?.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Access Denied: This portal is for Administrators only.`
    )
  }

  // 5. compare given password:
  const isPasswordMatched = await comparePassword(password, user.password)

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Credential not matched!')
  }

  // 6. Prepare jwt payload:
  const jwtPayload: IJwtUserPayload = {
    _id: user._id?.toString(),
    email: user?.email,
    name: user?.name,
    profileImage: user?.profileImage as string,
    status: user?.status,
  }

  // 7. Generate access token :
  const accessToken = createToken(
    jwtPayload,
    configs.jwt.accessToken.secret,
    configs.jwt.accessToken.expiresIn
  )

  // 8. Generate refresh token
  const refreshToken = createToken(
    jwtPayload,
    configs.jwt.refreshToken.secret,
    configs.jwt.refreshToken.expiresIn
  )

  return {
    refreshToken,
    accessToken,
    email: user.email,
    isTwofactorEnabled: user.isTwoFactorEnabled,
    role: user?.role,
  }
}

const refreshToken = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Refresh token is required!')
  }

  // 1. check is refresh token valid : ?
  const decoded = await verifyToken(refreshToken, configs.jwt.refreshToken.secret)

  if (!decoded?.email) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid access token')
  }

  /**
   * 2. Fetch user
   */
  const user = await User.isUserExistByEmail(decoded.email)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found')
  }

  /**
   * 3. Account status checks
   */
  if (await User.isUserBlocked(user)) {
    throw new AppError(httpStatus.FORBIDDEN, 'Your account has been blocked')
  }

  if (await User.isUserDeleted(user)) {
    throw new AppError(httpStatus.GONE, 'Your account has been deleted')
  }

  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.FORBIDDEN, 'Please verify your account')
  }

  if (await User.isUserUnderReview(user)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account is under review. Please submit required documents'
    )
  }

  if (user.status !== AuthStatus.ACTIVE) {
    throw new AppError(httpStatus.FORBIDDEN, 'Your account is not active')
  }

  /**
   * 4. Token invalidation check
   */
  if (
    user.passwordChangedAt &&
    (await User.isJwtIssuedBeforePasswordChanged(user.passwordChangedAt, decoded.iat as number))
  ) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Token has expired. Please log in again')
  }

  /**
   * 4.1. Token invalidation check
   */
  if (
    user.loggedOutAt &&
    (await User.isJwtIssuedBeforeLoggedout(user.loggedOutAt, decoded.iat as number))
  ) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Token has expired. Please log in again')
  }

  const jwtPayload: IJwtUserPayload = {
    _id: user._id?.toString(),
    email: user?.email,
    name: user?.name,
    profileImage: user?.profileImage as string,
    status: user?.status,
  }

  // 5. Generate new access token :
  const accessToken = createToken(
    jwtPayload,
    configs.jwt.accessToken.secret,
    configs.jwt.accessToken.expiresIn
  )

  return { accessToken }
}

const logOut = async (user: IUser, payload: ILogoutPayload) => {
  const { fcmToken } = payload

  user.loggedOutAt = new Date()
  await user.save()

  // ?? Delete user fcm:
  await FcmToken.findOneAndDelete({
    user: user?._id,
    token: fcmToken,
  })

  return {
    userId: user?._id,
    loggedOutAt: user.loggedOutAt,
  }
}

export const AuthServices = {
  signUp,
  resendSignupOTP,
  verifySignupOTP,
  login,
  forgotPassword,
  verifyResetPasswordOtp,
  resendOTP,
  resetPassword,
  changedPassword,
  getMe,
  updateProfile,
  updateUserStatusById,
  adminLogin,
  ChangeProfilePicture,
  refreshToken,
  logOut,
}
