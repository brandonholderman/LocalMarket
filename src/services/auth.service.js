import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'

const BCRYPT_COST = 12
const JWT_EXPIRY = '7d'

function signToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
        },
        process.env.JWT_SECRET, 
        { expiresIn: JWT_EXPIRY }
    )
}


export async function registerUser({ email, password, displayName }) {
    const normalisedEmail = email.toLowerCase().trim()

    const existing = await pool.query(
        `SELECT id
         FROM users
         WHERE email = $1`,
         [normalisedEmail]
    )

    if (existing.rows.length > 0) {
        const err = new Error('Account with that email already exists')
        err.statusCode = 409
        throw err
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST)

    const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, created_at`,
         [normalisedEmail, passwordHash, displayName.trim()]
    )

    const user = rows[0]
    const token = signToken(user)

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            createdAt: user.created_at,
        },
    }
}


export async function loginUser({ email, password }) {
    const normalisedEmail = email.toLowerCase().trim()

    const { rows } = await pool.query(
        `SELECT id, email, password_hash, display_name
         FROM users
         WHERE email = $1`,
        [normalisedEmail]
    )

    const user = rows[0]


    const dummyHash = '$12thishasissomebullshiticamupwithbutnowitstooshortsoimmakin0xd'
    const hashToCompare = user ? user.password_hash : dummyHash
    const passwordMatches = await bcrypt.compare(password, hashToCompare)

    if (!user || !passwordMatches) {
        const err = new Error('Invalid email or password')
        err.statusCode = 401
        throw err
    }

    const token = signToken(user)

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
        },
    }
}

export async function getUserByID(id) {
    const { rows } = await pool.query(
        `SELECT id, email, display_name, created_at
         FROM users
         WHERE id = $1`,
         [id]
    )

    return rows[0] ?? null
}