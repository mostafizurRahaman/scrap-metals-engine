/* eslint-disable no-unused-vars */
import type { IUser } from 'packages/db/src'
import { Socket, type Server } from 'socket.io'

// ? Socket response type:
export interface ISocketResponse<T = null> {
  success: boolean
  message: string
  data: T
}

// ? Server to client events:
export type TErrorFunc = (res: ISocketResponse) => void

// ? Client to server events:
export type TJoinFunc = (data: { conversationId: string }) => void

export interface IServerToClientEvents {
  socket_error: TErrorFunc
}

export interface IClientToServerEvents {
  join: TJoinFunc
}

export type TInternalServerEvents = Record<string, unknown>

export interface ISocketData {
  user: IUser
}

export type TServer = Server<
  IClientToServerEvents,
  IServerToClientEvents,
  TInternalServerEvents,
  ISocketData
>
export type TClient = Socket<
  IClientToServerEvents,
  IServerToClientEvents,
  TInternalServerEvents,
  ISocketData
>
