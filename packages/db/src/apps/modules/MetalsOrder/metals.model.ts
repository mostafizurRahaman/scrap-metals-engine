import { Schema, Types } from 'mongoose'
import type { IMetalItem, IMetalsOrder } from './metals.interface'
import { metalUnitValues } from './metals.constant'
import { Order } from '../Order'

const metalItemSchema = new Schema<IMetalItem>(
  {
    metalId: {
      type: Types.ObjectId,
      ref: 'Metal',
      required: true,
    },
    nameAtOrder: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitType: {
      type: String,
      enum: metalUnitValues,
      required: true,
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
