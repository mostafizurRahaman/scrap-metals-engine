import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { contentControllers } from './content.controllers'
import { contentValidations } from './content.validations'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from '@repo/db'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(contentValidations.updateContentSchema),
  contentControllers.updateContent
)

router.get(
  '/:type',
  validateRequest(contentValidations.getContentByIdSchema),
  contentControllers.getContentByType
)

export const contentRoutes = router
