import z from "zod"
        import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
        import { messageSortableFields } from "@repo/db"



        const createMessageSchema = z.object({
          body: z.object({})
        })

        const updateMessageSchema = z.object({
          params: z.object({
            id: requiredString("ID")
          }),
          body: z.object({})
        })

        const getAllMessageSchema = z.object({
          query: z.object({
            page: optionalNumber("Page"),
            limit: optionalNumber("Limit"),
            searchTerm: optionalString("Search term"),
            sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
            sortBy: optionalEnumString(messageSortableFields, "Sort by"),
            fromDate: optionalDate("From date"),
            toDate: optionalDate("To date")
          })
        })

        const getMessageByIdSchema = z.object({
          params: z.object({
            id: requiredString("ID")
          })
        })

        const deleteMessageByIdSchema = z.object({
          params: z.object({
            id: requiredString("ID")
          })
        })

        export const messageValidations = {
          createMessageSchema,
          updateMessageSchema,
          getAllMessageSchema,
          getMessageByIdSchema,
          deleteMessageByIdSchema
        }

        export type TCreateMessagePayloadType = z.infer<typeof createMessageSchema.shape.body>
        export type TUpdateMessagePayloadType = z.infer<typeof updateMessageSchema.shape.body>
        export type TGetAllMessageQueryParamsType = z.infer<typeof getAllMessageSchema.shape.query>
        export type TGetMessageByIdParamsType = z.infer<typeof getMessageByIdSchema.shape.params>
        export type TDeleteMessageByIdParamsType = z.infer<typeof deleteMessageByIdSchema.shape.params>