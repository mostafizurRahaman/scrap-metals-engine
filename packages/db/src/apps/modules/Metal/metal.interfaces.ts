import { Document, Types } from 'mongoose'
import type { TMetalUnitType } from './metal.constants'

export interface IMetal {
  name: string
  slug: string
  createdBy: Types.ObjectId
  price: number
  previousPrice: number
  unit: TMetalUnitType
}

export interface IMetalDoc extends Document, IMetal {}

// export interface IMetalModel extends Model<IMetalDoc> {
//   getById(id: string): Promise<IMetal | null>
// }
