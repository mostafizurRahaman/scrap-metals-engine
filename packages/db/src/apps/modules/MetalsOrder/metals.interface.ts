import type { Types } from 'mongoose'
import type { IOrder } from '../Order'

export interface IMetalItem {
  metal: Types.ObjectId
  quantity: number
}

export interface IMetalsOrder extends IOrder {
  items: IMetalItem[]
}
