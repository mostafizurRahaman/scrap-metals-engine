import { Schema, model } from 'mongoose'
import type { IContentDoc } from './content.interfaces'
import { contentTypeValues } from './content.constant'

const contentSchema = new Schema<IContentDoc>(
  {
    type: {
      type: String,
      enum: contentTypeValues,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// contentSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Content = model<IContentDoc>('Content', contentSchema)
