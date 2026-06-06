import { Order } from '@repo/db'

const generateOrderNumber = (): string => {
  return `ORD-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`
}

export const generateUniqueOrderNumber = async (): Promise<string> => {
  const orderNumber = generateOrderNumber()

  const exists = await Order.exists({ orderNumber })

  if (exists) {
    return generateUniqueOrderNumber() // try again
  }

  return orderNumber
}
