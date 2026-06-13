/* eslint-disable no-unused-vars */
import type { Types } from 'mongoose'
import type { IUser } from 'packages/db/src'
import { Socket, type Server } from 'socket.io'

// ? Socket response type:
export interface ISocketResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface IMessagePayload {
  conversationId: string
  message: string
  attachments: string[]
}

// ? Server to client events:
export type TErrorFunc = <T>(res: ISocketResponse<T>) => void
export type TNewMessage = <T>(data: ISocketResponse<T>) => void

// ? Client to server events:
export type TJoinFunc = (data: { conversationId: string }) => void
export type TSendMessage = (data: IMessagePayload) => void

export interface IServerToClientEvents {
  socket_error: TErrorFunc
  new_message: TNewMessage
}

export interface IClientToServerEvents {
  join: TJoinFunc
  send_message: TSendMessage
}

export type TInternalServerEvents = Record<string, unknown>

export interface ISocketData {
  user: IUser
  userId: string
  activeConversation: string
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
