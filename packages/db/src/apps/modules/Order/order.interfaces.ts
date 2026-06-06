import { Document, Types } from 'mongoose'
import type {
  TDeliveryType,
  TOrderStatusType,
  TOrderType,
  TPickupPointType,
} from './order.constants'

export interface IOrder {
  orderNumber: string
  customer: Types.ObjectId
  employee: Types.ObjectId

  orderType: TOrderType
  deliveryType: TDeliveryType
  status: TOrderStatusType

  orderRequestedAt: Date
  preferredDate: Date

  subTotal: number
  qoutedPrice: number
  pickupPrice: number
  totalPrice: number

  pickupAddress: string
  pickupPoint: TPickupPointType

  additionalNotes?: string
  attachments?: string[]

  createdAt: Date
  updatedAt: Date
}

export interface IOrderDoc extends Document, IOrder {}
