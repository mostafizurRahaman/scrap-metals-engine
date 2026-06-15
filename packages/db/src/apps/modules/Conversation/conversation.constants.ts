export const conversationSearchableFields = ['opponentEmail', 'opponentName'] as const

export const supportConversationSearchableFields = [
  'requesterRole',
  'requesterEmail',
  'requesterName',
] as const

export const conversationSortableFields = ['createdAt', 'updatedAt'] as const

export const conversationType = {
  OrderChat: 'OrderChat',
  SUPPORT: 'Support',
} as const

export const OrderChatStatus = {
  ACTIVE: 'active',
  closed: 'closed',
} as const

export const conversationTypeValues = Object.values(conversationType)
export const orderChatStatusValues = Object.values(OrderChatStatus)

// Types (optional but recommended)
export type TConversationSearchableField = (typeof conversationSearchableFields)[number]

export type TConversationSortableField = (typeof conversationSortableFields)[number]
export type TConversationType = (typeof conversationType)[keyof typeof conversationType]
export type TOrderChatStatusType = (typeof OrderChatStatus)[keyof typeof OrderChatStatus]
