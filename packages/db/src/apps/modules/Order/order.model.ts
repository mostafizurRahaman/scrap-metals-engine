import { Schema, Types, model } from 'mongoose'
import type { IOrderDoc } from './order.interfaces'
import {
  DeliveryMethod,
  deliveryMethodValues,
  GetPickupPoints,
  GetPickupPointsType,
  OrderStatus,
  orderStatusValues,
  orderTypeValues,
} from './order.constants'

const pickupPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(GetPickupPointsType),
      default: GetPickupPoints.Point,
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  { _id: false }
)

const orderSchema = new Schema<IOrderDoc>(
  {
    orderNumber: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    customer: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employee: {
      type: Types.ObjectId,
      ref: 'User',
    },
    orderType: {
      type: String,
      enum: orderTypeValues,
      required: true,
    },
    deliveryType: {
      type: String,
      enum: deliveryMethodValues,
      default: DeliveryMethod.DROPOFF,
    },
    status: {
      type: String,
      enum: orderStatusValues,
      default: OrderStatus.PENDING,
    },

    // Date fields:
    orderRequestedAt: {
      type: Date,
      required: true,
      default: Date.now(),
    },
    preferredDate: {
      type: Date,
      required: true,
    },

    // Price related fields:
    subTotal: {
      type: Number,
      required: true,
    },
    qoutedPrice: {
      type: Number,
    },
    pickupPrice: {
      type: Number,
    },
    totalPrice: {
      type: Number,
    },

    // Optional Fields:
    pickupAddress: {
      type: String,
    },

    pickupPoint: {
      type: pickupPointSchema,
    },

    // Notes:
    additionalNotes: {
      type: String,
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  {
    discriminatorKey: 'orderType',
    timestamps: true,
    versionKey: false,
  }
)

export const Order = model<IOrderDoc>('Order', orderSchema)
