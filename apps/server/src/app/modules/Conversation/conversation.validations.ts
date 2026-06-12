import z from "zod"
        import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
        import { conversationSortableFields } from "@repo/db"



        const createConversationSchema = z.object({
          body: z.object({})
        })

        const updateConversationSchema = z.object({
          params: z.object({
            id: requiredString("ID")
          }),
          body: z.object({})
        })

        const getAllConversationSchema = z.object({
          query: z.object({
            page: optionalNumber("Page"),
            limit: optionalNumber("Limit"),
            searchTerm: optionalString("Search term"),
            sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
            sortBy: optionalEnumString(conversationSortableFields, "Sort by"),
            fromDate: optionalDate("From date"),
            toDate: optionalDate("To date")
          })
        })

        const getConversationByIdSchema = z.object({
          params: z.object({
            id: requiredString("ID")
          })
        })

        const deleteConversationByIdSchema = z.object({
          params: z.object({
            id: requiredString("ID")
          })
        })

        export const conversationValidations = {
          createConversationSchema,
          updateConversationSchema,
          getAllConversationSchema,
          getConversationByIdSchema,
          deleteConversationByIdSchema
        }

        export type TCreateConversationPayloadType = z.infer<typeof createConversationSchema.shape.body>
        export type TUpdateConversationPayloadType = z.infer<typeof updateConversationSchema.shape.body>
        export type TGetAllConversationQueryParamsType = z.infer<typeof getAllConversationSchema.shape.query>
        export type TGetConversationByIdParamsType = z.infer<typeof getConversationByIdSchema.shape.params>
        export type TDeleteConversationByIdParamsType = z.infer<typeof deleteConversationByIdSchema.shape.params>