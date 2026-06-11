import type { IUser } from 'packages/db/src'
import { Socket, type Server } from 'socket.io'

export interface IServerToClientEvents {
  no: () => void
}

export interface IClientToServerEvents {
  no: () => void
}

export type TInternalServerEvents = Record<string, unknown>

export interface ISocketData {
  user: IUser
}

export type TServer = Server<
  IServerToClientEvents,
  IClientToServerEvents,
  TInternalServerEvents,
  ISocketData
>
export type TClient = Socket<
  IServerToClientEvents,
  IClientToServerEvents,
  TInternalServerEvents,
  ISocketData
>
