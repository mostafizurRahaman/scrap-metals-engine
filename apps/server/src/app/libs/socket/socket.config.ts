import type { TServer } from './socket.types'
import { Server as HttpServer } from 'http'
import { Server, type ServerOptions } from 'socket.io'
import { logger } from '../logger'
import configs from '@app/configs'
import httpStatus from 'http-status'
import { AppError, verifyToken, type IJwtUserPayload } from '@repo/shared'
import { AuthStatus, Conversation, OrderChatStatus, User } from '@repo/db'
import mongoose from 'mongoose'

// let io :
let io: TServer | null = null

export const socketConfigs = {
  init: (httpServer: HttpServer, customOptions?: Partial<ServerOptions>) => {
    if (io) {
      logger.warn('⚠️ Socket.io is already initialized!')
      return io
    }

    // ? Default options for io
    const defaultOptions: Partial<ServerOptions> = {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingTimeout: 60000,
    }

    //  ? Setup the socket io server:
    io = new Server<TServer>(httpServer, {
      ...defaultOptions,
      ...customOptions,
    }) as TServer

    logger.info('Socket io initialized successfully!')

    registerSocketHandler(io as TServer)

    return io
  },

  /**
   * Retrieves the global active Socket.io instance
   */
  getIO: (): Server => {
    if (!io) {
      throw new Error('❌ Socket.io has not been initialized. Call init() first!')
    }
    return io
  },

  /**
   * Utility helper to safely emit messages from anywhere in the backend application
   */
  emitToRoom: <T>(roomId: string, event: string, payload: T): void => {
    try {
      const ioInstance = socketConfigs.getIO()
      ioInstance.to(roomId).emit(event, payload)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(`🔴 Failed to emit event "${event}" to room "${roomId}":`, error.message)
    }
  },
}

const registerSocketHandler = (io: TServer) => {
  //  ? Middleware
  io.use(async (socket, next) => {
    try {
      // 1. Check headers for authorization token:
      const token = (socket.handshake.auth.token ||
        socket.handshake.headers.token ||
        socket.handshake.query.token) as string | undefined

      if (!token)
        return next(new AppError(httpStatus.UNAUTHORIZED, 'Authentication token is required!'))

      // 2. Decode the token:
      const decode = (await verifyToken(token, configs.jwt.accessToken.secret)) as IJwtUserPayload
      if (!decode.email) {
        return next(new AppError(httpStatus.UNAUTHORIZED, `You are unauthorized!`))
      }

      // 3. Now Retrived the user:
      const user = await User.isUserExistByEmail(decode.email)
      if (!user) {
        return next(new AppError(httpStatus.UNAUTHORIZED, `User doesn't exists!`))
      }

      // 4. Check is user blocked?:
      if (await User.isUserBlocked(user)) {
        return next(new AppError(httpStatus.FORBIDDEN, 'Your account has been blocked'))
      }

      // 5. Check is user deleted?:
      if (await User.isUserDeleted(user)) {
        return next(new AppError(httpStatus.GONE, 'Your account has been deleted'))
      }
      // 6. Check is user isOtpVerified
      if (!user.isOtpVerified) {
        return next(new AppError(httpStatus.FORBIDDEN, 'Please verify your account'))
      }

      // 7. Check is user status underReview
      if (await User.isUserUnderReview(user)) {
        return next(
          new AppError(
            httpStatus.FORBIDDEN,
            'Your account is under review. Please submit required documents'
          )
        )
      }

      if (user.status !== AuthStatus.ACTIVE) {
        return next(new AppError(httpStatus.FORBIDDEN, 'Your account is not active'))
      }

      // 8. Check is token valid ? :
      if (
        user.passwordChangedAt &&
        (await User.isJwtIssuedBeforePasswordChanged(user.passwordChangedAt, decode?.iat as number))
      ) {
        return next(new AppError(httpStatus.UNAUTHORIZED, 'Token has expired. Please log in again'))
      }

      // 4. set user into socket data:
      socket.data.user = user

      next()
    } catch (err: unknown) {
      logger.error('error', err)
      next(new AppError(httpStatus.UNAUTHORIZED, `You are unauthorized!`))
    }
  })

  // ? Connect socket
  io.on('connection', async (socket) => {
    const user = socket.data.user

    //  ? Join into channel:
    socket.on('join', async ({ conversationId }) => {
      // ? Check is conversation is a valid id?:
      if (!mongoose.isValidObjectId(conversationId)) {
        return socket.emit('socket_error', {
          success: false,
          message: 'Invalid conversation id',
          data: null,
        })
      }

      // ? Check any conversation active with this id?:
      const conversation = await Conversation.findById(conversationId)
      if (!conversation) {
        return socket.emit('socket_error', {
          success: false,
          message: `Conversation does not exist!`,
          data: null,
        })
      }

      // join into channel (conversation id)
      socket.join(conversation?._id?.toString())
      logger.info(`${user.name} is joined into conversation channel.`)
    })

    //  ? Socket disconnect :
    socket.on('disconnect', (reason) => {
      logger.info(`❌ Socket io is disconnected for ${reason}`)
    })
  })
}
