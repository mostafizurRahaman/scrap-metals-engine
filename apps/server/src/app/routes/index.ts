import { authRoutes } from '@app/modules/Auth/user.routes'
import { metalRoutes } from '@app/modules/Metal/metal.routes'
import { orderRoutes } from '@app/modules/Order/order.routes'
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
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
