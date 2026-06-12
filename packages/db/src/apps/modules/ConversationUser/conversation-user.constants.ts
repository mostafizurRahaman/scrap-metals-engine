export const conversationUserSearchableFields = ['name'] as const

export const conversationUserSortableFields = ['createdAt', 'updatedAt'] as const

// Types (optional but recommended)
export type TConversationUserSearchableField = (typeof conversationUserSearchableFields)[number]

export type TConversationUserSortableField = (typeof conversationUserSortableFields)[number]
