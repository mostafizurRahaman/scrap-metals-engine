import type {
  IClientToServerEvents,
  IInterServerEvents,
  IServerToClientEvents,
  ISocketData,
  TServer,
} from './socket.types'
import { Server as HttpServer } from 'http'
import { Server, type ServerOptions } from 'socket.io'
import { logger } from '../logger'
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
        origin: configs.corsOrigins?.split(','),
        methods: ['GET', 'POST'],
      },
      pingTimeout: 60000,
    }

    //  ? Setup the socket io server:
    io = new Server(httpServer, {
      ...defaultOptions,
      ...customOptions,
    })

    logger.info('Socket io initialized successfully!')

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
