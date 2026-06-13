import type { TServer } from './socket.types'
import { Server as HttpServer } from 'http'
import { Server, type ServerOptions } from 'socket.io'
import { logger } from '../logger'
import mongoose from 'mongoose'
import {
  AuthStatus,
  Conversation,
  conversationType,
  ConversationUser,
  Message,
  OrderChatStatus,
  User,
  type IMessageDoc,
  type IOrderChatDoc,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError, verifyToken, type IJwtUserPayload } from 'packages/shared/src'
import configs from '@app/configs'
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
      // pingTimeout: 60000,
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
    logger.info('New user connected')
    const user = socket.data.user
    socket.data.userId = user?._id?.toString()

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

      // ? Check is the user member of this channel ?:
      const isMember = await ConversationUser.exists({
        user: user?._id,
        conversation: conversation?._id,
      })

      if (!isMember) {
        return socket.emit('socket_error', {
          success: false,
          message: `You are not a member of this conversation!`,
          data: null,
        })
      }

      // ? Check is user already joined into this room?:
      const room = io.sockets.adapter.rooms.get(conversation?._id?.toString())
      const isJoined = room?.has(socket.id)
      if (isJoined) {
        logger.info(`${user?.name} has already joined into conversation channel.`)
        return
      }

      // join into channel (conversation id)
      socket.join(conversation?._id?.toString())
      socket.data.activeConversation = conversation?._id?.toString()
      logger.info(`${user?.name} is joined into conversation channel.`)
    })

    // ? Send Message:
    socket.on('send_message', async ({ message, attachments, conversationId }) => {
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

      // ? Check is conversation type and conversation status:
      if (conversation?.type === conversationType.OrderChat) {
        const orderConversation = conversation as unknown as IOrderChatDoc
        if (orderConversation.status === OrderChatStatus.closed) {
          return socket.emit('socket_error', {
            success: false,
            message: `You can not send message for closed chat!`,
            data: null,
          })
        }
      }

      // ? Check is the user member of this channel ?:
      const isMember = await ConversationUser.exists({
        user: user?._id,
        conversation: conversation?._id,
      })

      if (!isMember) {
        return socket.emit('socket_error', {
          success: false,
          message: `You are not a member of this conversation!`,
          data: null,
        })
      }

      // ? Check is Valid message ?:
      const isInValidMessage = !message || message?.length < 1
      const isInValidAttachments =
        !attachments || !Array.isArray(attachments) || attachments?.length < 1

      if (isInValidMessage && isInValidAttachments) {
        return socket.emit('socket_error', {
          success: false,
          message: `Content is required to send message!`,
          data: null,
        })
      }

      // ? Get all participants of the chat :
      const participants = await ConversationUser.find({
        conversation: conversation?._id,
      }).select({
        user: 1,
        _id: 0,
      })

      // ? Get all connected sockets:
      const connectedSocekts = Array.from(io.sockets.sockets.values())

      const activeParticipantDocs = participants?.filter((participant) => {
        // ** Check is user active in conversation ?:
        return connectedSocekts.some((oponent) => {
          return (
            oponent.data.userId === participant?.user?.toString() && oponent.data.activeConversation
          )
        })
      })

      // map to user ids (ObjectId|string) for use in MongoDB $in queries
      const activeParticipantIds = activeParticipantDocs
        ?.map((p) => p.user?.toString())
        .filter(Boolean)

      // ? Configure mongoose session:

      const session = await mongoose.startSession()

      try {
        await session.startTransaction()

        // ? Create message
        const [newMessage] = await Message.create(
          [
            {
              conversation: conversation?._id,
              sender: user?._id,
              text: message,
              attachments: attachments,
            },
          ],
          {
            session,
          }
        )

        // ? Update last read at:
        if (Array.isArray(activeParticipantIds) && activeParticipantIds.length >= 1) {
          await ConversationUser.updateMany(
            {
              user: {
                $in: activeParticipantIds,
              },
            },
            {
              $set: {
                lastReadAt: new Date(),
              },
            },
            {
              session,
            }
          )
        }

        await session.commitTransaction()
        io.to(conversation?._id.toString()).emit('new_message', {
          success: true,
          message: 'New Message',
          data: newMessage as IMessageDoc,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        await session.abortTransaction()
        socket.emit('socket_error', {
          success: false,
          message: error.message || 'Failed to send message',
          data: null,
        })
      } finally {
        await session.endSession()
      }
    })

    //  ? Socket disconnect :
    socket.on('disconnect', (reason) => {
      logger.info(`❌ Socket io is disconnected for ${reason}`)
    })
  })
}
