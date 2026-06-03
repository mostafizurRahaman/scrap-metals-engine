import { Schema, Types, model } from 'mongoose'
import type { IMetalDoc } from './metal.interfaces'

const metalSchema = new Schema<IMetalDoc>(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: Types.ObjectId,
      required: true,
      ref: 'User',
    },
    pricePerKg: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    pricePerUnit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    previousPricePerKg: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    previousPricePerUnit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const Metal = model<IMetalDoc>('Metal', metalSchema)
