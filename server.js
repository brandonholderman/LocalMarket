
// import http from 'http'
// import { withTransaction } from './src/config/db.js'
import pool, { connectDB } from './src/config/db.js'
import express from 'express'
import 'dotenv-expand/config'

const port = process.env.PORT
const app = express()

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/marketplace', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM listings')
        res.json(result.rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database Error' })
    }
})

async function start() {
    await connectDB()
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })    
}

start().catch(err => {
    console.error('Startup failed: ', err)
    process.exit(1)
})

// dbConnction.one('SELECT $1 AS value', 123)
//     .then((data) => {
//         console.log('DATA:', data.value)
//     })
//     .catch((error) => {
//         console.log('ERROR:', error)
//     })


// const pool = new Pool({
//     onConnect: async (client) => {
//         await client.query('SET search_path TO my_schema')
//     },
// })
