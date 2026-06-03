export interface BaseQueryParams {
  page?: number | undefined
  limit?: number | undefined
  searchTerm?: string | undefined
  sortOrder?: 'asc' | 'desc'
  sortBy?: string | undefined
  fromDate?: Date | undefined
  toDate?: Date | undefined
}
