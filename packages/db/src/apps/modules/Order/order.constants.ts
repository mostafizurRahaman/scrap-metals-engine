export const orderSearchableFields = ['name'] as const

export const orderSortableFields = ['createdAt', 'updatedAt'] as const

export const OrderType = {
  VEHICLE: 'vehicle',
  METAL: 'metal',
}

export const OrderStatus = {
  PENDING: 'pending',
  QOUTED: 'qouted',
  ACCEPTED: 'accepted',
  ASSIGNED: 'assigned',
  ON_THE_WAY: 'on_the_way',
  COMPLTED: 'completed',
  CANCELLED: 'cancelled',
}

// Types (optional but recommended)
export type TOrderSearchableField = (typeof orderSearchableFields)[number]
export type TOrderSortableField = (typeof orderSortableFields)[number]
export type TOrderType = keyof typeof OrderType
export type TOrderStatus = keyof typeof OrderStatus 
