import moment from 'moment'
import { AuthRoles, employeeAssignStatus, Metal, Order, User } from '@repo/db'
import type { TGetDashboardOverviewQueryType } from './analytics.validations'
import type { PipelineStage } from 'mongoose'

/**
 * Calculates the start and end dates for a given year using Moment.js
 * @param year - The year as a number or string (e.g., 2026)
 */
export const getYearDateRange = (year: number | string) => {
  // Construct a moment object for January 1st of that year
  const startOfYear = moment(`${year}-01-01`).startOf('year')
  const endOfYear = moment(`${year}-01-01`).endOf('year')

  return {
    // .toDate() converts the moment object back to a standard JavaScript Date object
    startDate: startOfYear.toDate(),
    endDate: endOfYear.toDate(),

    // Or if your database queries accept ISO strings, you can return these instead:
    startDateISO: startOfYear.toISOString(),
    endDateISO: endOfYear.toISOString(),
  }
}

const getDashboardOverview = async (query: TGetDashboardOverviewQueryType) => {
  const { customerGrowthYear, purchaseGrowthYear } = query

  const currentYear = new Date().getFullYear()

  // 1. Get Date Ranges
  const { startDateISO, endDateISO } = getYearDateRange(customerGrowthYear || currentYear)
  const { startDateISO: stDate, endDateISO: edDate } = getYearDateRange(
    purchaseGrowthYear || currentYear
  )

  // 2. Execute Aggregations Parallelly
  const [users, metals, rawCustomers, rawOrders] = await Promise.all([
    User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]),
    Metal.aggregate([
      {
        $count: 'total',
      },
    ]),
    // Customer growth aggregated by month
    User.aggregate([
      {
        $match: {
          role: AuthRoles.CUSTOMER,
          createdAt: {
            $gte: new Date(startDateISO),
            $lte: new Date(endDateISO),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Order / Purchase growth aggregated by month
    Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(stDate),
            $lte: new Date(edDate),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ])

  // 3. Define Baseline Structure for All 12 Months
  const monthList = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ]

  // 4. Map and Format Data (Fills missing months with 0)
  const customerGrowth = monthList.map((monthName, index) => {
    const targetMonthNum = index + 1 // MongoDB months are 1-12
    const foundData = rawCustomers.find((item) => item._id === targetMonthNum)
    return {
      month: monthName,
      count: foundData ? foundData.count : 0,
    }
  })

  const purchaseGrowth = monthList.map((monthName, index) => {
    const targetMonthNum = index + 1
    const foundData = rawOrders.find((item) => item._id === targetMonthNum)
    return {
      month: monthName,
      count: foundData ? foundData.count : 0,
    }
  })

  // 5. Build Final Response Payload
  const totalMetals = metals[0]?.total || 0

  // Quick transformation for total user distribution if needed by front-end
  const userCounts = users.reduce((acc: Record<string, number>, curr) => {
    if (curr._id) acc[curr._id.toLowerCase()] = curr.count
    return acc
  }, {})

  const totalUsers = users.reduce((acc: number, curr) => {
    if (curr._id) acc = acc + (curr.count || 0)
    return acc
  }, 0)

  return {
    summary: {
      totalMetals,
      totalUsers,
      ...userCounts,
    },
    customerGrowth,
    purchaseGrowth,
  }
}

const getEmployeeOverview = async () => {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        role: AuthRoles.STAFF,
      },
    },
  ]

  pipeline.push(
    {
      $lookup: {
        from: 'assignedemployees',
        localField: '_id',
        foreignField: 'employee',
        pipeline: [
          {
            $match: {
              status: { $in: [employeeAssignStatus.ACCEPTED, employeeAssignStatus.PENDING] },
            },
          },
        ],
        as: 'assingnments',
      },
    },
    {
      $addFields: {
        isBusy: {
          $gte: [{ $size: '$assingnments' }, 2],
        },
      },
    },
    {
      $project: {
        assingnments: 0,
      },
    }
  )

  // pipeline.push({
  //   $facet: {
  //     employee: [
  //       {
  //         $group: {
  //           _id: null,
  //           count: {
  //             $sum: 1,
  //           },
  //         },
  //       },
  //     ],
  //   },
  // })

  // 2. Execute Aggregations Parallelly
  const employee = User.aggregate(pipeline)

  return employee
}

export const analyticsServices = {
  getDashboardOverview,
  getEmployeeOverview,
}

/* 
Hi Rey, 
I am 


*/
