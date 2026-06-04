export const orderSearchableFields = ['name'] as const

export const orderSortableFields = ['createdAt', 'updatedAt'] as const

export const OrderType = {
  VEHICLE: 'vehicle',
  METAL: 'metal',
}

export const orderTypeValues = Object.values(OrderType)
export const OrderStatus = {
  PENDING: 'pending',
  QOUTED: 'qouted',
  ACCEPTED: 'accepted',
  ASSIGNED: 'assigned',
  ON_THE_WAY: 'on_the_way',
  RECEIVED: 'received',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const orderStatusValues = Object.values(OrderStatus)

export const DeliveryMethod = {
  DROPOFF: 'drop_off',
  PICKUP: 'pickup',
}

export const deliveryMethodValues = Object.values(DeliveryMethod)

export const GetPickupPoints = {
  Point: 'Point',
} as const

export const GetPickupPointsType = Object.values(GetPickupPoints)

// Types (optional but recommended)
export type TOrderSearchableField = (typeof orderSearchableFields)[number]
export type TOrderSortableField = (typeof orderSortableFields)[number]
export type TOrderType = (typeof OrderType)[keyof typeof OrderType]
export type TOrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus]
export type TDeliveryType = (typeof DeliveryMethod)[keyof typeof DeliveryMethod]
export type TPickupPointType = (typeof GetPickupPointsType)[keyof typeof GetPickupPointsType]
