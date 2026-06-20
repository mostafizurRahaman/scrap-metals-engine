import { logger } from '@app/libs/logger'
import { catchAsync } from '@repo/shared'
import type { ZodObject } from 'zod'

export const validateRequest = (schema: ZodObject) => {
  return catchAsync(async (req, res, next) => {
    const { data, success, error } = await schema.safeParseAsync({
      body: req.body,
      params: req.params,
      query: req.query,
      cookies: req.cookies,
    })

    if (success) {
      if (data.body) {
        req.body = data.body
      }

      if (data.cookies) {
        req.cookies = data.cookies
      }

      next()
    } else {
      logger.error('Validation error', error)
      next(error)
    }
  })
}
