import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { bannerControllers } from './banner.controllers'
import { bannerValidations } from './banner.validations'
import { multerFactory } from 'packages/media-hub/src'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.post(
  '/',
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('banner'),
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  bannerControllers.createBanner
)

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN, AuthRoles.CUSTOMER, AuthRoles.STAFF),
  validateRequest(bannerValidations.getAllBannerSchema),
  bannerControllers.getAllBanner
)

router.delete(
  '/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(bannerValidations.deleteBannerByIdSchema),
  bannerControllers.deleteBannerById
)

export const bannerRoutes = router
