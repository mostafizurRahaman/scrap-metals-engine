import { Schema } from 'mongoose'
import type { IVehicleOrder, IVehicleSpecs } from './vehicle.interface'
import { Order } from '../Order'

const VehicleSepcificationSchema = new Schema<IVehicleSpecs>(
  {
    weightLbs: { type: Number, default: 0 },
    aluminumWeightLbs: { type: Number, default: 0 },
    wheelWeightLbs: { type: Number, default: 0 },
    batteryWeightLbs: { type: Number, default: 0 },
    breakageWeightLbs: { type: Number, default: 0 },
  },
  {
    _id: false,
  }
)

const VehicleOrderSchema = new Schema<IVehicleOrder>(
  {
    vinNumber: {
      type: String,
      required: true,
      unique: true,
    },
    model: {
      type: String,
      required: false,
    },
    year: {
      type: String,
      required: false,
    },
    spcs: {
      type: VehicleSepcificationSchema,
    },
  },
  {
    _id: false,
  }
)

export const Vehicle = Order.discriminator('Vehicle', VehicleOrderSchema)
