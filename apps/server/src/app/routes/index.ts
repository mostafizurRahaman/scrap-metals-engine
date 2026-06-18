import { fcmTokenRoutes } from './../modules/FcmToken/fcm-token.routes'
import { analyticsRoutes } from '@app/modules/Analytics/analytics.routes'
import { assignedEmployeeRoutes } from '@app/modules/AssignedEmployee/assigned-employee.routes'
import { authRoutes } from '@app/modules/Auth/user.routes'
import { bannerRoutes } from '@app/modules/Banner/banner.routes'
import { contentRoutes } from '@app/modules/Content/content.routes'
import { conversationRoutes } from '@app/modules/Conversation/conversation.routes'
import { employeeRoutes } from '@app/modules/Employee/employee.routes'
import { metalRoutes } from '@app/modules/Metal/metal.routes'
import { notificationRoutes } from '@app/modules/Notification/notification.routes'
import { orderRoutes } from '@app/modules/Order/order.routes'
import { orderHistoryRoutes } from '@app/modules/OrderHistory/order-history.routes'
import { userRoutes } from '@app/modules/User/user.routes'
import express, { Router } from 'express'

const router: Router = express.Router()

const routes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/metal',
    route: metalRoutes,
  },
  {
    path: '/order',
    route: orderRoutes,
  },
  {
    path: '/assignment',
    route: assignedEmployeeRoutes,
  },
  {
    path: '/order-history',
    route: orderHistoryRoutes,
  },
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/employee',
    route: employeeRoutes,
  },
  {
    path: '/banner',
    route: bannerRoutes,
  },
  {
    path: '/content',
    route: contentRoutes,
  },
  {
    path: '/analytics',
    route: analyticsRoutes,
  },
  {
    path: '/conversation',
    route: conversationRoutes,
  },
  {
    path: '/fcm',
    route: fcmTokenRoutes,
  },
  {
    path: '/notification',
    route: notificationRoutes,
  },
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
