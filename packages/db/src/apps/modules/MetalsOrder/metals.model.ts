import { Schema, Types } from 'mongoose'
import type { IMetalItem, IMetalsOrder } from './metals.interface'
import { Order } from '../Order'

const metalItemSchema = new Schema<IMetalItem>(
  {
    metalId: {
      type: Types.ObjectId,
      ref: 'Metal',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
)

const metalOrderSchema = new Schema<IMetalsOrder>({
  items: [metalItemSchema],
})

export const MetalOrder = Order.discriminator('Metals', metalOrderSchema)
