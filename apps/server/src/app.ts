import express, { type Request, type Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import configs from './app/configs'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import { notFound } from './app/middlewares/not-found'
import globalErrorHandler from './app/middlewares/global-error-handler'
import { allRoutes } from '@app/routes'
import { logger } from '@app/libs/logger'
import os from 'node:os'
import { exec } from 'child_process'

const app: express.Application = express()

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 munite
  max: 500, // limit each IP to 100 requests per windowMs
  message: 'Too many accounts created from this IP, please try again after a minute',
})

const stream = {
  write: (message: string) => logger.http(message),
}

// application level middlewars:
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream,
  })
)
app.use(helmet())
app.use(express.json())
app.use(cookieParser())
app.use(
  cors({
    origin: configs.corsOrigins?.split(','), // split all the origins
    credentials: true,
  })
)
app.use(limiter)

// root endpoint:
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: `Your server is running now`,
  })
})

app.get('/health', (req: Request, res: Response) => {
  const totalRam = os.totalmem()
  const freeRam = os.freemem()
  const usedRam = totalRam - freeRam

  exec('df -h / | tail -1', (err, stdout) => {
    if (err) {
      return res.status(500).json({ error: err.message })
    }

    const disk = stdout.trim().split(/\s+/)

    res.json({
      ram: {
        used: (usedRam / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        total: (totalRam / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      },
      disk: {
        used: disk[2],
        total: disk[1],
        percent: disk[4],
      },
    })
  })
})

// other api endpoints with versions :
app.use('/api/v1', allRoutes)

// not found middleware:
app.use(notFound)

// global error handler
app.use(globalErrorHandler)

export default app
