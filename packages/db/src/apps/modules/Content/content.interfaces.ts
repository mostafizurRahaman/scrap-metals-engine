import { Document } from 'mongoose'
import type { TContentType } from './content.constant'

export interface IContent {
  type: TContentType
  content: string
}

export interface IContentDoc extends Document, IContent {}

// export interface IContentModel extends Model<IContentDoc> {
//   getById(id: string): Promise<IContent | null>
// }
