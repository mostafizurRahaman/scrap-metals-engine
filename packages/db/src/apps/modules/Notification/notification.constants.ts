export const notificationSearchableFields = ['name'] as const

export const notificationType = {
  // ORDER RELATED FIELD:
  NEW_ORDER: 'NEW_ORDER',
  ORDER_ACCEPTED: 'ORDER_ACCEPTED',
  QOUTE_REQUEST: 'QOUTE_REQUEST',
  ORDER_ASSIGNED: 'ORDER_ASSIGNED',
  ORDER_ON_THE_WAY: 'ORDER_ON_THE_WAY',
  ORDER_RECEIVED: 'ORDER_RECEIVED',
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',

  // NEW MESSAGE:
  NEW_MESSAGE: 'NEW_MESSAGE',
  NEW_SUPPORT_MESSAGE: 'NEW_SUPPORT_MESSAGE',
} as const

export const notificationTypeValues = Object.values(notificationType)

export const notificationSortableFields = ['createdAt', 'updatedAt'] as const

// Types (optional but recommended)
export type TNotificationSearchableField = (typeof notificationSearchableFields)[number]

export type TNotificationSortableField = (typeof notificationSortableFields)[number]

export type TNotificationType = (typeof notificationType)[keyof typeof notificationType]
