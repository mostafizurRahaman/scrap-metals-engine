import { FcmToken, fcmTokenSearchableFields  } from "@repo/db"
        import httpStatus from "http-status"
        import { AppError } from "@repo/shared"
        import type { PipelineStage } from "mongoose"

        import type {
          TCreateFcmTokenPayloadType,
          TUpdateFcmTokenPayloadType,
          TGetAllFcmTokenQueryParamsType
        } from "./fcm-token.validations"

        const createFcmToken = async (payload: TCreateFcmTokenPayloadType) => {
          const result = await FcmToken.create(payload)
          return result
        }

        const updateFcmToken = async (id: string, payload: TUpdateFcmTokenPayloadType) => {
          const result = await FcmToken.findOneAndUpdate(
            { _id: id },
            { $set: payload },
            { new: true }
          )

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "FcmToken not found")
          }

          return result
        }

        const getAllFcmToken = async (query: TGetAllFcmTokenQueryParamsType) => {
          const {
            page = 1,
            limit = 10,
            searchTerm,
            sortOrder = 'desc',
            sortBy = 'createdAt',
            fromDate,
            toDate
          } = query

          const skip = (page - 1) * limit
          const pipeline: PipelineStage[] = []

          if (fromDate || toDate) {
            const dateFilter : Record<string,unknown> = {}
            if (fromDate) dateFilter.$gte = new Date(fromDate)
            if (toDate) dateFilter.$lte = new Date(toDate)

            pipeline.push({ $match: { createdAt: dateFilter } })
          }

          if (searchTerm) {
            pipeline.push({
              $match: {
                $or: fcmTokenSearchableFields.map(field => ({
                  [field]: { $regex: searchTerm, $options: 'i' }
                }))
              }
            })
          }

          pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

          pipeline.push({
            $facet: {
              data: [{ $skip: skip }, { $limit: limit }],
              meta: [{ $count: 'total' }]
            }
          })

          const aggregated = await FcmToken.aggregate(pipeline)

          const data = aggregated?.[0]?.data || []
          const total = aggregated?.[0]?.meta?.[0]?.total || 0

          return {
            data,
            meta: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit) || 1
            }
          }
        }

        const getFcmTokenById = async (id: string) => {
          const result = await FcmToken.findById(id)

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "FcmToken not found")
          }

          return result
        }

        const deleteFcmTokenById = async (id: string) => {
          const result = await FcmToken.findOneAndDelete({ _id: id })

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "FcmToken not found")
          }

          return result
        }

        export const fcmTokenServices = {
          createFcmToken,
          updateFcmToken,
          getAllFcmToken,
          getFcmTokenById,
          deleteFcmTokenById
        }