import { Pool } from 'pg'
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'

const env = dotenv.config()
dotenvExpand.expand(env)

const dbConnection = process.env.DB_URL
const dbPoolMax = process.env.DB_POOL_MAX
const dbIdleTimeout = process.env.DB_IDLE_TIMEOUT
const dbConnectionTimeout = process.env.DB_CONNECTION_TIMEOUT


const pool = new Pool({
    connectionString: dbConnection,
    max: dbPoolMax ?? 10,
    idleTimeoutMillis: dbIdleTimeout ?? 30000,
    connectionTimeoutMillis: dbConnectionTimeout ?? 2000,
    maxLifetimeSeconds: 60,
    // ssl: process.env.NODE_ENV === 'production'
    //     ? { rejectUnauthorized: false }
    //     : false,
    // Enable above setting when deploying ^^^^^
})

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client: ', err.message)
})

export async function connectDB() {
    //DB connection check
    try {
        const result = await pool.query('SELECT NOW() AS now')
        console.log('Connected to Postgres — server time: ', result.rows[0].now)
    } catch (err) {
        console.error('Failed to connect to Postgres: ', err)
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