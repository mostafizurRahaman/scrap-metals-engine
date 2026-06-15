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

export interface TTypingPayload {
  conversationId: string
}

// ? Server to client events:
export type TErrorFunc = <T>(res: ISocketResponse<T>) => void
export type TNewMessage = <T>(data: ISocketResponse<T>) => void
export type TDisplayTyping = <T>(data: ISocketResponse<T>) => void
export type TParticipantList = <T>(data: ISocketResponse<T>) => void
// ? Client to server events:
export type TJoinFunc = (data: { conversationId: string }) => void
export type TJoinSupportFunc = (data: { conversationId: string }) => void
export type TSendMessage = (data: IMessagePayload) => void
export type TTyping = (data: TTypingPayload) => void
export type TLeaveFunc = (data: { conversationId: string }) => void
export interface IServerToClientEvents {
  socket_error: TErrorFunc
  new_message: TNewMessage
  display_typing: TDisplayTyping
  participant_status: TParticipantList
}

export interface IClientToServerEvents {
  join: TJoinFunc
  join_support: TJoinSupportFunc
  send_message: TSendMessage
  typing: TTyping
  leave_conversation: TLeaveFunc
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
