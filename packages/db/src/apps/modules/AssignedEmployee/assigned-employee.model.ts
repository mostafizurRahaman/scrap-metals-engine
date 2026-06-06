import { Schema, Types, model } from 'mongoose'
import type { IAssignedEmployeeDoc } from './assigned-employee.interfaces'
import { employeeAssignStatusValues } from './assigned-employee.constants'

const assignedEmployeeSchema = new Schema<IAssignedEmployeeDoc>(
  {
    employee: {
      type: Types.ObjectId,
      required: true,
      ref: 'User',
    },
    order: {
      type: Types.ObjectId,
      required: true,
      ref: 'Order',
    },
    status: {
      type: String,
      required: true,
      enum: employeeAssignStatusValues,
    },
    assignedAt: {
      type: Date,
      required: true,
    },
    acceptedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// assignedEmployeeSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const AssignedEmployee = model<IAssignedEmployeeDoc>(
  'AssignedEmployee',
  assignedEmployeeSchema
)
