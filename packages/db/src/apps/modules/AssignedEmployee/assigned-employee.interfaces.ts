import { Document, Types } from 'mongoose'
import type { TAssignEmployeeStatusType } from './assigned-employee.constants'

export interface IAssignedEmployee {
  employee: Types.ObjectId
  order: Types.ObjectId
  status: TAssignEmployeeStatusType
  assignedAt: Date
  acceptedAt: Date
  completedAt: Date
  cancelledAt: Date
  cancelledReason?: string
}

export interface IAssignedEmployeeDoc extends Document, IAssignedEmployee {}
