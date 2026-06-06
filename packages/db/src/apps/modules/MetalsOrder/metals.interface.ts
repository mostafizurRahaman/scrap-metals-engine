import type { Types } from 'mongoose'
import type { IOrder } from '../Order'
import type { TMetalUnitType } from '../Metal/metal.constants'


export interface IMetalItem {
  metal: Types.ObjectId
  quantity: number
  price: number
  name: string
  unit: TMetalUnitType
}

export interface IMetalsOrder extends IOrder {
  items: IMetalItem[]
}
