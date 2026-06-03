import { Document, Types } from 'mongoose'

export interface IMetal {
  name: string
  slug: string
  createdBy: Types.ObjectId
  pricePerKg: number
  pricePerUnit: number
  previousPricePerKg: number
  previousPricePerUnit: number
}

export interface IMetalDoc extends Document, IMetal {}

// export interface IMetalModel extends Model<IMetalDoc> {
//   getById(id: string): Promise<IMetal | null>
// }
