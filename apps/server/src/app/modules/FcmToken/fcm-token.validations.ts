import z from "zod"
        import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
        import { fcmTokenSortableFields } from "@repo/db"



        const createFcmTokenSchema = z.object({
          body: z.object({})
        })

        const updateFcmTokenSchema = z.object({
          params: z.object({
            id: requiredString("ID")
          }),
          body: z.object({})
        })

        const getAllFcmTokenSchema = z.object({
          query: z.object({
            page: optionalNumber("Page"),
            limit: optionalNumber("Limit"),
            searchTerm: optionalString("Search term"),
            sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
            sortBy: optionalEnumString(fcmTokenSortableFields, "Sort by"),
            fromDate: optionalDate("From date"),
            toDate: optionalDate("To date")
          })
        })

        const getFcmTokenByIdSchema = z.object({
          params: z.object({
            id: requiredString("ID")
          })
        })

        const deleteFcmTokenByIdSchema = z.object({
          params: z.object({
            id: requiredString("ID")
          })
        })

        export const fcmTokenValidations = {
          createFcmTokenSchema,
          updateFcmTokenSchema,
          getAllFcmTokenSchema,
          getFcmTokenByIdSchema,
          deleteFcmTokenByIdSchema
        }

        export type TCreateFcmTokenPayloadType = z.infer<typeof createFcmTokenSchema.shape.body>
        export type TUpdateFcmTokenPayloadType = z.infer<typeof updateFcmTokenSchema.shape.body>
        export type TGetAllFcmTokenQueryParamsType = z.infer<typeof getAllFcmTokenSchema.shape.query>
        export type TGetFcmTokenByIdParamsType = z.infer<typeof getFcmTokenByIdSchema.shape.params>
        export type TDeleteFcmTokenByIdParamsType = z.infer<typeof deleteFcmTokenByIdSchema.shape.params>