// const dotenv = require('dotenv')
// dotenv.config()
// const pg = require('pg')
// const pgp = require('pg-promise')
// const express = require('express')

// import dotenv from 'dotenv'
// dotenv.config({ path: '.env' })


// import http from 'http'
import pool, { connectDB, withTransaction } from './src/config/db.js'
import express from 'express'
const port = process.env.PORT

const app = express()

app.get('/marketplace', async (req, res) => {
    const result = await pool.query('SELECT * FROM listings')
    res.send(result ?? null)
})

app.get('/', (req, res) => {
    res.send('Hello World!')
})

async function start() {
    await connectDB()
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })    
}

start()

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
