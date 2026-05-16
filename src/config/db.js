// const pg = require('pg')
// const pgp = require('pg-promise')
// const dotenv = require('dotenv')
// import pgp from 'pg-promise'

// const db = pgp(process.env.DB_NAME)
// const dbHost = pgp(process.env.DB_HOST)
// const dbUser = pgp(process.env.DB_USER)
// const dbConnction = pgp(process.env.DB_URL)
// const dbPoolMax = pgp(process.env.DB_POOL_MAX)
// const dbIdleTimeout = pgp(process.env.DB_IDLE_TIMEOUT)
// const dbConnectionTimeout = pgp(process.env.DB_CONNECTION_TIMEOUT)


import { Pool } from 'pg'
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const port = process.env.PORT
const db = process.env.DB_NAME
const dbHost = process.env.DB_HOST
const dbUser = process.env.DB_USER
const datO = process.env.DAT_ONE
// const dbConnection = process.env.DB_URL
const dbConnection = `postgres://${dbUser}:${datO}@${dbHost}:${port}/${db}`

const dbPoolMax = process.env.DB_POOL_MAX
const dbIdleTimeout = process.env.DB_IDLE_TIMEOUT
const dbConnectionTimeout = process.env.DB_CONNECTION_TIMEOUT


const pool = new Pool({
    host: dbHost,
    user: dbUser,
    connectionString: dbConnection,
    max: dbPoolMax,
    idleTimeoutMillis: dbIdleTimeout,
    connectionTimeoutMillis: dbConnectionTimeout,
    maxLifetimeSeconds: 60,
    // ssl: process.env.NODE_ENV === 'production'
    //     ? { rejectUnauthorized: false }
    //     : false,
    // Enable above setting when deploying ^^^^^
})

pool.on('error', (err, client) => {
    console.error(`${db} Unexpected error on idle client:`, err.message)
})

export async function connectDB() {
    //DB connection check
    try {
        const result = await pool.query('SELECT NOW() AS now')
        console.log(`${dbHost} Connected to Postgres — server time: ${result.rows[0].now}`)
    } catch (err) {
        console.error(`${dbHost} Failed to connect to Postgres:`, err.message)
        process.exit(1)
    }
}


export async function withTransaction(callback) {
    const client = await pool.connect()
    try {
        await client.query('BEGIN') // Opens private workspace
        const result = await callback(client) // awaits the transaction being sent from the client. (Data being committed)
        await client.query('COMMIT') // Attempts to commit data passed in from callback
        return result 
    } catch (err) {
        await client.query('ROLLBACK') // In the event of an error partial saves will be rolled back and removed. 
        throw err
    } finally {
        client.release() // Releases the client and closes connection to prevent server leaks. 
    }
}


// Allows file to be exported and used. 
export default pool;