import z from 'zod'

const currentYear = new Date().getFullYear()

const getDashboardOverview = z.object({
  query: z.object({
    customerGrowthYear: z.coerce
      .number()
      .int('Year must be an integer')
      .min(1900, 'Year must be 1900 or later')
      .max(currentYear, `Year cannot be greater than ${currentYear}`)
      .default(currentYear),
    purchaseGrowthYear: z.coerce
      .number()
      .int('Year must be an integer')
      .min(1900, 'Year must be 1900 or later')
      .max(currentYear, `Year cannot be greater than ${currentYear}`)
      .default(currentYear),
  }),
})

export const analyticsValidations = { getDashboardOverview }

export type TGetDashboardOverviewQueryType = z.infer<typeof getDashboardOverview.shape.query>
