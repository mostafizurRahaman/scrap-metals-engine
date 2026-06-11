import { Message, messageSearchableFields  } from "@repo/db"
        import httpStatus from "http-status"
        import { AppError } from "@repo/shared"
        import type { PipelineStage } from "mongoose"

        import type {
          TCreateMessagePayloadType,
          TUpdateMessagePayloadType,
          TGetAllMessageQueryParamsType
        } from "./message.validations"

        const createMessage = async (payload: TCreateMessagePayloadType) => {
          const result = await Message.create(payload)
          return result
        }

        const updateMessage = async (id: string, payload: TUpdateMessagePayloadType) => {
          const result = await Message.findOneAndUpdate(
            { _id: id },
            { $set: payload },
            { new: true }
          )

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "Message not found")
          }

          return result
        }

        const getAllMessage = async (query: TGetAllMessageQueryParamsType) => {
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
                $or: messageSearchableFields.map(field => ({
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

          const aggregated = await Message.aggregate(pipeline)

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

        const getMessageById = async (id: string) => {
          const result = await Message.findById(id)

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "Message not found")
          }

          return result
        }

        const deleteMessageById = async (id: string) => {
          const result = await Message.findOneAndDelete({ _id: id })

          if (!result) {
            throw new AppError(httpStatus.NOT_FOUND, "Message not found")
          }

          return result
        }

        export const messageServices = {
          createMessage,
          updateMessage,
          getAllMessage,
          getMessageById,
          deleteMessageById
        }