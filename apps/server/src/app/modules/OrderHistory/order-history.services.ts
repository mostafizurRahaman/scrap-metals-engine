import { Order, OrderHistory, User, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'

const getOrderHistoryById = async (user: IUser, id: string) => {
  const order = await Order.findById(id)

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found.')
  }

  if (order.customer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, "This order doesn't belogs to you.")
  }

  const orderHistory = await OrderHistory.find({
    order: order?._id,
  })

  // Find out he employee:
  const employee = await User.findOne({
    _id: order?.employee,
  }).select(' name email phoneNumber  ')

  return {
    histories: orderHistory,
    address: order?.pickupAddress,
    orderNumber: order?.orderNumber,
    employeeId: order?.employee,
    employeeName: employee?.name,
    employeeEmail: employee?.email,
    employeePhoneNumber: employee?.phoneNumber,
  }
}

export const orderHistoryServices = {
  getOrderHistoryById,
}
