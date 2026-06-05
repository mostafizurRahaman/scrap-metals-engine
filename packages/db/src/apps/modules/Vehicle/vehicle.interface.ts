import type { IOrder } from '../Order'

export interface IVehicleSpecs {
  weightLbs?: number
  aluminumWeightLbs?: number
  wheelWeightLbs?: number
  batteryWeightLbs?: number
  breakageWeightLbs?: number
}

export interface IVehicleOrder extends IOrder {
  vinNumber: string
  model: string
  year: string
  spcs: IVehicleSpecs
}
