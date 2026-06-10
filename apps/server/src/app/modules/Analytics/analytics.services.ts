import moment from 'moment'
import { AuthRoles, employeeAssignStatus, Metal, Order, OrderStatus, User } from '@repo/db'
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
      $match: { role: AuthRoles.STAFF },
    },
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
        as: 'assignments',
      },
    },
    {
      $addFields: {
        // Logic: Busy if they have 2 or more active assignments
        isBusy: { $gte: [{ $size: '$assignments' }, 2] },
      },
    },
    {
      $facet: {
        stats: [
          {
            $group: {
              _id: null,
              totalEmployee: { $sum: 1 },
              onDuty: {
                $sum: { $cond: ['$isBusy', 1, 0] },
              },
              available: {
                $sum: { $cond: ['$isBusy', 0, 1] },
              },
            },
          },
        ],
      },
    },
    {
      // Flatten the result so you don't get an array inside an object
      $project: {
        overview: { $arrayElemAt: ['$stats', 0] },
      },
    },
  ]

  const result = await User.aggregate(pipeline)

  // Return a clean object or default values if no employees exist
  return result[0]?.overview || { totalEmployee: 0, onDuty: 0, available: 0 }
}

const getOrderOverview = async () => {
  const pipeline: PipelineStage[] = []

  pipeline.push({
    $group: {
      _id: null,
      totalOrder: { $sum: 1 },
      pending: {
        $sum: {
          $cond: [{ $eq: ['$status', OrderStatus.PENDING] }, 1, 0],
        },
      },
      qouted: {
        $sum: {
          $cond: [{ $eq: ['$status', OrderStatus.QOUTED] }, 1, 0],
        },
      },
      accepted: {
        $sum: {
          $cond: [{ $eq: ['$status', OrderStatus.ACCEPTED] }, 1, 0],
        },
      },
      assigned: {
        $sum: {
          $cond: [{ $eq: ['$status', OrderStatus.ASSIGNED] }, 1, 0],
        },
      },
      on_the_way: {
        $sum: {
          $cond: [{ $eq: ['$status', OrderStatus.ON_THE_WAY] }, 1, 0],
        },
      },
      received: {
        $sum: {
          $cond: [{ $eq: ['$status', OrderStatus.RECEIVED] }, 1, 0],
        },
      },
      completed: {
        $sum: {
          $cond: [{ $eq: ['$status', OrderStatus.COMPLETED] }, 1, 0],
        },
      },
      cancelled: {
        $sum: {
          $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0],
        },
      },
      // inProgress: {
      //   $sum: {
      //     $cond: [
      //       {
      //         $in: [
      //           '$status',
      //           [OrderStatus.ASSIGNED, OrderStatus.RECEIVED, OrderStatus.ON_THE_WAY],
      //         ],
      //       },
      //       1,
      //       0,
      //     ],
      //   },
      // },
    },
  })

  const order = await Order.aggregate(pipeline)

  return (
    order?.[0] || {
      _id: null,
      totalOrder: 0,
      pending: 0,
      qouted: 0,
      accepted: 0,
      assigned: 0,
      on_the_way: 0,
      received: 0,
      completed: 0,
      cancelled: 0,
    }
  )
}

export const analyticsServices = {
  getDashboardOverview,
  getEmployeeOverview,
  getOrderOverview,
}
