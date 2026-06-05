import type { Types } from 'mongoose'
import type { IOrder } from '../Order'

export interface IMetalItem {
  metalId: Types.ObjectId
  nameAtOrder: string
  unitType: 'LBS' | 'PCS'
  quantity: number
}

export interface IMetalsOrder extends IOrder {
  items: IMetalItem[]
}
