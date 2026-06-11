import { Conversation, conversationSearchableFields  } from "@repo/db"
        import httpStatus from "http-status"
        import { AppError } from "@repo/shared"
        import type { PipelineStage } from "mongoose"

        import type {
          TCreateConversationPayloadType,
          TUpdateConversationPayloadType,
          TGetAllConversationQueryParamsType
        } from "./conversation.validations"

        const createConversation = async (payload: TCreateConversationPayloadType) => {
          const result = await Conversation.create(payload)
          return result
        }

        const updateConversation = async (id: string, payload: TUpdateConversationPayloadType) => {
          const result = await Conversation.findOneAndUpdate(
            { _id: id },
            { $set: payload },
            { new: true }
          )

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "Conversation not found")
          }

          return result
        }

        const getAllConversation = async (query: TGetAllConversationQueryParamsType) => {
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
                $or: conversationSearchableFields.map(field => ({
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

          const aggregated = await Conversation.aggregate(pipeline)

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

        const getConversationById = async (id: string) => {
          const result = await Conversation.findById(id)

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "Conversation not found")
          }

          return result
        }

        const deleteConversationById = async (id: string) => {
          const result = await Conversation.findOneAndDelete({ _id: id })

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "Conversation not found")
          }

          return result
        }

        export const conversationServices = {
          createConversation,
          updateConversation,
          getAllConversation,
          getConversationById,
          deleteConversationById
        }