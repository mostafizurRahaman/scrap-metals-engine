import { Schema, Types, model } from 'mongoose'
import type { IOrderHistoryDoc } from './order-history.interfaces'
import { orderStatusValues } from '../Order/order.constants'

const orderHistorySchema = new Schema<IOrderHistoryDoc>(
  {
    order: {
      type: Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    status: {
      type: String,
      enum: orderStatusValues,
      required: true,
    },
    previousStatus: {
      type: String,
      enum: orderStatusValues,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      required: true,
    },
    changedBy: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const OrderHistory = model<IOrderHistoryDoc>('OrderHistory', orderHistorySchema)
