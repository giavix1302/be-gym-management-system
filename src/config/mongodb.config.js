import { MongoClient, ServerApiVersion } from 'mongodb'
import { env } from './environment.config.js'

let gmsDatabaseInstance = null
console.log('>>>>>>>>>>> env mongodb:', env.MONGODB_URL)

const mongoClientInstance = new MongoClient(env.MONGODB_URL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

export const CONNECT_DB = async () => {
  await mongoClientInstance.connect()
  gmsDatabaseInstance = mongoClientInstance.db(env.DATABASE_NAME)
}

export const GET_DB = () => {
  if (!gmsDatabaseInstance) throw new Error('Must connect to database first')
  return gmsDatabaseInstance
}

export const CLOSE_DB = async () => {
  await mongoClientInstance.close()
}
