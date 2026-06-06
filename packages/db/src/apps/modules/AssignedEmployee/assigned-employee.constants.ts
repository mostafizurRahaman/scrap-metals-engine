export const assignedEmployeeSearchableFields = ['name'] as const

export const assignedEmployeeSortableFields = ['createdAt', 'updatedAt'] as const

export const employeeAssignStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export const employeeAssignStatusValues = Object.values(employeeAssignStatus)

// Types (optional but recommended)
export type TAssignedEmployeeSearchableField = (typeof assignedEmployeeSearchableFields)[number]

export type TAssignedEmployeeSortableField = (typeof assignedEmployeeSortableFields)[number]

export type TAssignEmployeeStatusType =
  (typeof employeeAssignStatus)[keyof typeof employeeAssignStatus]
