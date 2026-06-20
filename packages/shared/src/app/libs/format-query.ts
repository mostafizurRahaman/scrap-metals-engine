import type { BaseQueryParams } from '../types'

export const formatQuery = (query: BaseQueryParams) => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
  } = query

  const dateFilter: Record<string, Date> = {}

  if (fromDate) dateFilter.$gte = new Date(fromDate)
  if (toDate) dateFilter.$lte = new Date(toDate)

  return {
    page: Number(page),
    limit: Number(limit),
    skip: (Number(page) - 1) * Number(limit),
    searchTerm,
    sortOrder,
    sortBy,
    fromDate,
    toDate,
    dateFilter,
  }
}
