import { ConversationUser, conversationUserSearchableFields  } from "@repo/db"
        import httpStatus from "http-status"
        import { AppError } from "@repo/shared"
        import type { PipelineStage } from "mongoose"

        import type {
          TCreateConversationUserPayloadType,
          TUpdateConversationUserPayloadType,
          TGetAllConversationUserQueryParamsType
        } from "./conversation-user.validations"

        const createConversationUser = async (payload: TCreateConversationUserPayloadType) => {
          const result = await ConversationUser.create(payload)
          return result
        }

        const updateConversationUser = async (id: string, payload: TUpdateConversationUserPayloadType) => {
          const result = await ConversationUser.findOneAndUpdate(
            { _id: id },
            { $set: payload },
            { new: true }
          )

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "ConversationUser not found")
          }

          return result
        }

        const getAllConversationUser = async (query: TGetAllConversationUserQueryParamsType) => {
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
                $or: conversationUserSearchableFields.map(field => ({
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

          const aggregated = await ConversationUser.aggregate(pipeline)

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

        const getConversationUserById = async (id: string) => {
          const result = await ConversationUser.findById(id)

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "ConversationUser not found")
          }

          return result
        }

        const deleteConversationUserById = async (id: string) => {
          const result = await ConversationUser.findOneAndDelete({ _id: id })

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "ConversationUser not found")
          }

          return result
        }

        export const conversationUserServices = {
          createConversationUser,
          updateConversationUser,
          getAllConversationUser,
          getConversationUserById,
          deleteConversationUserById
        }