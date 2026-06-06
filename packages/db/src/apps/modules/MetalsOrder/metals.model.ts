import { Schema, Types } from 'mongoose'
import type { IMetalItem, IMetalsOrder } from './metals.interface'
import { Order } from '../Order'
import { metalUnitValues } from '../Metal/metal.constants'

const metalItemSchema = new Schema<IMetalItem>(
  {
    metal: {
      type: Types.ObjectId,
      ref: 'Metal',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
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
