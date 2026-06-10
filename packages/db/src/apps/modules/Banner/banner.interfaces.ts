import { Document } from 'mongoose'

export interface IBanner {
  url: string
}

export interface IBannerDoc extends Document, IBanner {}

// export interface IBannerModel extends Model<IBannerDoc> {
//   getById(id: string): Promise<IBanner | null>
// }
