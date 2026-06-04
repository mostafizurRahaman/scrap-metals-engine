import { Document, Types } from 'mongoose'

export interface IMetal {
  name: string
  slug: string
  createdBy: Types.ObjectId
  pricePerLbs: number
  pricePerUnit: number
  previousPricePerLbs: number
  previousPricePerUnit: number
}

export interface IMetalDoc extends Document, IMetal {}

// export interface IMetalModel extends Model<IMetalDoc> {
//   getById(id: string): Promise<IMetal | null>
// }
