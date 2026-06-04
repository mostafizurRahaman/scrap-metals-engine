import { Schema } from 'mongoose'
import type { IVehicleOrder } from './vehicle.interface'
import { Order } from '../Order'

const VehicleOrderSchema = new Schema<IVehicleOrder>({
  vinNumber: {
    type: String,
    required: true,
    unique: true,
  },
  model: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  spcs: {
    weightLbs: { type: Number, default: 0 },
    aluminumWeightLbs: { type: Number, default: 0 },
    wheelWeightLbs: { type: Number, default: 0 },
    batteryWeightLbs: { type: Number, default: 0 },
    breakageWeightLbs: { type: Number, default: 0 },
  },
})

export const Vehicle = Order.discriminator('Vehicle', VehicleOrderSchema)
