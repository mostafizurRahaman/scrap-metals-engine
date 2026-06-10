import { Content } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'

import type { TUpdateContentPayloadType } from './content.validations'
import type { TContentType } from 'packages/db/src/apps/modules/Content/content.constant'

const updateContent = async (payload: TUpdateContentPayloadType) => {
  const { type, content } = payload
  // Use find one and update to update the content:

  const newContent = await Content.findOneAndUpdate(
    {
      type,
    },
    {
      $set: {
        content,
      },
    },
    {
      new: true,
      upsert: true,
    }
  )

  return newContent
}

const getContentByType = async (type: TContentType) => {
  const result = await Content.findOne({
    type,
  })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found')
  }

  return result
}

export const contentServices = {
  updateContent,

  getContentByType,
}
