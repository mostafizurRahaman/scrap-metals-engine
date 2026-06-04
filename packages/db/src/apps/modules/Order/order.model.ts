import { Schema, model } from 'mongoose'
  import type { IOrderDoc } from './order.interfaces'

const orderSchema = new Schema<IOrderDoc>(
  {
    name: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// orderSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Order = model<IOrderDoc>(
  'Order',
  orderSchema
)