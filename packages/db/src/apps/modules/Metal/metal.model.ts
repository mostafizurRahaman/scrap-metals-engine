import { Schema, Types, model } from 'mongoose'
import type { IMetalDoc } from './metal.interfaces'
import { metalUnitValues } from './metal.constants'

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
    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    previousPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      enum: metalUnitValues,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const Metal = model<IMetalDoc>('Metal', metalSchema)
