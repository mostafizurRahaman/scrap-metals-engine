import { Document, Types } from 'mongoose'

// Table orders {
//   id object_id [pk]
//   orderNumber string [unique, note: 'Unique order reference']
//   customer_id object_id [ref: > users.id]
//   assignedTo_id object_id [ref: > users.id, null]
//   orderType string [note: 'VEHICLE or METALS']
//   deliveryMethod string [note: 'DROP_OFF or PICKUP']
//   status string [default: 'PENDING']
//   orderRequestAt datetime [default: `now()` ]
//   preferredDate datetime
//   additionalNotes string
//   attachments string[]

//   // Pricing Embedded Object
//   subTotal double [default: 0]
//   pickupFee double [default: 0]
//   proposedPrice double [default: 0]
//   finalPrice double [default: 0]

//   // Location Embedded Object
//   pickup_address string
//   pickup_coordinates_long double
//   pickup_coordinates_lat double

//   createdAt datetime
//   updatedAt datetime
// }

export interface IOrder {
  id: Types.ObjectId
  orderNumber: string
  customer: Types.ObjectId
  employee: Types.ObjectId
}

export interface IOrderDoc extends Document, IOrder {}

// export interface IOrderModel extends Model<IOrderDoc> {
//   getById(id: string): Promise<IOrder | null>
// }
