import { Schema, model } from 'mongoose'
import type { IBannerDoc } from './banner.interfaces'

const bannerSchema = new Schema<IBannerDoc>(
  {
    url: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// bannerSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Banner = model<IBannerDoc>('Banner', bannerSchema)
