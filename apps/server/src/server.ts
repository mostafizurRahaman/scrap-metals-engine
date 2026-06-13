import { connectDB } from '@repo/db'
import { Server, createServer } from 'http'
import configs from './app/configs'
import app from './app'
import { logger } from '@app/libs/logger'

import dns from 'node:dns/promises'
import { seedSuperAdmin } from '@app/libs/seed-super-admin'

import { socketConfigs } from '@app/libs/socket/socket.config'

dns.setServers(['1.1.1.1'])
const server: Server = createServer(app)

//  boostrap function :
const boostrap = async () => {
  try {
    await connectDB(configs.databaseUrl)

    logger.info('✅ Database connected  successfully!')

    await seedSuperAdmin()

    // ? Socket serevr registered:
    socketConfigs.init(server)

    // server listen :
    server.listen(configs.port, () => {
      logger.info(`🧑‍🚀🚀 Server is running on ${configs.port}`)
    })
  } catch (err) {
    logger.error(`❌ Database connection failed ❌`, err)
  }
}

// bootstrap the project
boostrap()

// handle unhandled rejection
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', {
    reason,
  })
  if (server) {
    server.close(() => {
      process.exit(1)
    })
  }

  process.exit(1)
})

// handled uncaughtException:
process.on('uncaughtException', (error) => {
  logger.error('uncaughtException: ERROR', error.message)
  process.exit(1)
})
