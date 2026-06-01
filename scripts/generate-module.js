const fs = require('fs')
const path = require('path')

const MODULES_DIR = path.join(process.cwd(), './apps/server/src/app/modules')
const DB_MODULES_DIR = path.join(process.cwd(), './packages/db/src/apps/modules')

// ----------------------
// STRING CASE UTIL
// ----------------------
const StringCase = {
  toWords(str) {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_\-]+/g, ' ')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
  },

  snake(str) {
    return this.toWords(str).join('_')
  },

  camel(str) {
    const words = this.toWords(str)
    return words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join('')
  },

  pascal(str) {
    return this.toWords(str)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join('')
  },

  kebab(str) {
    return this.toWords(str).join('-')
  },
}

// ----------------------
// GENERATOR FUNCTION
// ----------------------
const generateModule = (moduleName) => {
  if (!moduleName) {
    console.error('Please provide a module name!')
    process.exit(1)
  }

  // formats
  const kebabCase = StringCase.kebab(moduleName)
  const camelCase = StringCase.camel(moduleName)
  const pascalCase = StringCase.pascal(moduleName)
  const words = StringCase.toWords(moduleName)

  const modulePath = path.join(MODULES_DIR, pascalCase)

  const modulePathInsideDb = path.join(DB_MODULES_DIR, pascalCase)

  if (fs.existsSync(modulePath)) {
    console.error(`Module "${pascalCase}" already exists!`)
    process.exit(1)
  }

  if (fs.existsSync(modulePathInsideDb)) {
    console.error(`DB Module "${pascalCase}" already exists!`)
    process.exit(1)
  }

  fs.mkdirSync(modulePath, { recursive: true })
  fs.mkdirSync(modulePathInsideDb, { recursive: true })

  // ----------------------
  // FILE CONTENTS
  // ----------------------

  const files = {
    [`${kebabCase}.validations.ts`]: `
import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { ${camelCase}SortableFields } from "@repo/db"



const create${pascalCase}Schema = z.object({
  body: z.object({})
})

const update${pascalCase}Schema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAll${pascalCase}Schema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(${camelCase}SortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const get${pascalCase}ByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const delete${pascalCase}ByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const ${camelCase}Validations = {
  create${pascalCase}Schema,
  update${pascalCase}Schema,
  getAll${pascalCase}Schema,
  get${pascalCase}ByIdSchema,
  delete${pascalCase}ByIdSchema
}

export type TCreate${pascalCase}PayloadType = z.infer<typeof create${pascalCase}Schema.shape.body>
export type TUpdate${pascalCase}PayloadType = z.infer<typeof update${pascalCase}Schema.shape.body>
export type TGetAll${pascalCase}QueryParamsType = z.infer<typeof getAll${pascalCase}Schema.shape.query>
export type TGet${pascalCase}ByIdParamsType = z.infer<typeof get${pascalCase}ByIdSchema.shape.params>
export type TDelete${pascalCase}ByIdParamsType = z.infer<typeof delete${pascalCase}ByIdSchema.shape.params>
`,

    [`${kebabCase}.services.ts`]: `
import { ${pascalCase}, ${camelCase}SearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreate${pascalCase}PayloadType,
  TUpdate${pascalCase}PayloadType,
  TGetAll${pascalCase}QueryParamsType
} from "./${kebabCase}.validations"

const create${pascalCase} = async (payload: TCreate${pascalCase}PayloadType) => {
  const result = await ${pascalCase}.create(payload)
  return result
}

const update${pascalCase} = async (id: string, payload: TUpdate${pascalCase}PayloadType) => {
  const result = await ${pascalCase}.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "${pascalCase} not found")
  }

  return result
}

const getAll${pascalCase} = async (query: TGetAll${pascalCase}QueryParamsType) => {
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
        $or: ${camelCase}SearchableFields.map(field => ({
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

  const aggregated = await ${pascalCase}.aggregate(pipeline)

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

const get${pascalCase}ById = async (id: string) => {
  const result = await ${pascalCase}.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "${pascalCase} not found")
  }

  return result
}

const delete${pascalCase}ById = async (id: string) => {
  const result = await ${pascalCase}.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "${pascalCase} not found")
  }

  return result
}

export const ${camelCase}Services = {
  create${pascalCase},
  update${pascalCase},
  getAll${pascalCase},
  get${pascalCase}ById,
  delete${pascalCase}ById
}
`,

    [`${kebabCase}.controllers.ts`]: `
import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { ${camelCase}Services } from './${kebabCase}.services'

const create${pascalCase} = catchAsync(async (req, res) => {
  const result = await ${camelCase}Services.create${pascalCase}(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The ${words.join(' ')} created successfully!',
    data: result,
  })
})

const update${pascalCase} = catchAsync(async (req, res) => {
  const result = await ${camelCase}Services.update${pascalCase}(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The ${words.join(' ')} updated successfully!',
    data: result,
  })
})

const getAll${pascalCase} = catchAsync(async (req, res) => {
  const result = await ${camelCase}Services.getAll${pascalCase}(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The ${words.join(' ')} retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const get${pascalCase}ById = catchAsync(async (req, res) => {
  const result = await ${camelCase}Services.get${pascalCase}ById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The ${words.join(' ')} retrieved successfully!',
    data: result,
  })
})

const delete${pascalCase}ById = catchAsync(async (req, res) => {
  const result = await ${camelCase}Services.delete${pascalCase}ById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The ${words.join(' ')} deleted successfully!',
    data: result,
  })
})

export const ${camelCase}Controllers = {
  create${pascalCase},
  update${pascalCase},
  getAll${pascalCase},
  get${pascalCase}ById,
  delete${pascalCase}ById
}
`,

    [`${kebabCase}.routes.ts`]: `
import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { ${camelCase}Controllers } from './${kebabCase}.controllers'
import { ${camelCase}Validations } from './${kebabCase}.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(${camelCase}Validations.create${pascalCase}Schema),
  ${camelCase}Controllers.create${pascalCase}
)

router.patch(
  '/:id',
  validateRequest(${camelCase}Validations.update${pascalCase}Schema),
  ${camelCase}Controllers.update${pascalCase}
)

router.get(
  '/all',
  validateRequest(${camelCase}Validations.getAll${pascalCase}Schema),
  ${camelCase}Controllers.getAll${pascalCase}
)

router.get(
  '/:id',
  validateRequest(${camelCase}Validations.get${pascalCase}ByIdSchema),
  ${camelCase}Controllers.get${pascalCase}ById
)

router.delete(
  '/:id',
  validateRequest(${camelCase}Validations.delete${pascalCase}ByIdSchema),
  ${camelCase}Controllers.delete${pascalCase}ById
)

export const ${camelCase}Routes = router
`,
  }

  // ----------------------
  // DB FILE CONTENTS
  // ----------------------
  const dbFiles = {
    [`${kebabCase}.constants.ts`]: `export const ${camelCase}SearchableFields = [
  'name',
] as const

export const ${camelCase}SortableFields = [
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type T${pascalCase}SearchableField =
  (typeof ${camelCase}SearchableFields)[number]

export type T${pascalCase}SortableField =
  (typeof ${camelCase}SortableFields)[number]
`,

    [`${kebabCase}.interfaces.ts`]: `
  import { Document, Model } from 'mongoose'

  export interface I${pascalCase}  {
    name: string
  }

  export interface I${pascalCase}Doc extends Document, I${pascalCase}   {}

  // export interface I${pascalCase}Model extends Model<I${pascalCase}Doc> {
  //   getById(id: string): Promise<I${pascalCase} | null>
  // }
`,

    [`${kebabCase}.model.ts`]: `
  import { Schema, model } from 'mongoose'
  import type { I${pascalCase}Doc } from './${kebabCase}.interfaces'

const ${camelCase}Schema = new Schema<I${pascalCase}Doc>(
  {
    name: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// ${camelCase}Schema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const ${pascalCase} = model<I${pascalCase}Doc>(
  '${pascalCase}',
  ${camelCase}Schema
)
`,
    [`index.ts`]: `
    export * from "./${kebabCase}.model"
    export * from "./${kebabCase}.interfaces"
    export * from "./${kebabCase}.constants"

`,
  }

  // ----------------------
  // WRITE FILES
  // ----------------------
  Object.entries(files).forEach(([fileName, content]) => {
    const filePath = path.join(modulePath, fileName)
    fs.writeFileSync(filePath, content.trim())
  })
  console.log(`✅ Module "${pascalCase}" created successfully!`)
  // ----------------------
  // DB WRITE FILES
  // ----------------------
  Object.entries(dbFiles).forEach(([fileName, content]) => {
    const filePath = path.join(modulePathInsideDb, fileName)
    fs.writeFileSync(filePath, content.trim())
  })

  console.log(`✅ DB Module "${pascalCase}" created successfully!`)
}

// ----------------------
// CLI USAGE
// ----------------------
const moduleName = process.argv[2]
generateModule(moduleName)
