import { authRoutes } from '@app/modules/Auth/user.routes'
import { metalRoutes } from '@app/modules/Metal/metal.routes'
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
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
