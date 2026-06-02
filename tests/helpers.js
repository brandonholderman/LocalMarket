import pool from '../src/config/db.js'


// Should there be a function to create a test database to prevent this from removing actual data?


// export async function cleanDatabase() {
//     // Wipes all tables
//     await pool.query(`DELETE FROM messages`)
//     await pool.query(`DELETE FROM conversations`)
//     await pool.query(`DELETE FROM listings`)
//     await pool.query(`DELETE FROM users`)
// }


export async function createTestUser(overrides = {}) {
    // Create test user
    const defaults = {
        email: 'brandon@brandon.brandon',
        passwordHash: '$2b$12$KIXxK1yH9z0Z7Q2v3Nw4aOWQfLmP8RjT6YdUeVbNcXsA5MhGpDqIu',
        displayName: 'Some Dude',
    }

    const data = { ...defaults, ...overrides }

    const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, created_at`,
         [data.email, data.passwordHash, data.displayName]
    )

    return rows[0]
}

export async function createTestListing(sellerID, overrides = {}) {
    const defaults = {
        title: 'A. Brand. New. CAR!!!!',
        description: 'A ballin whip that goes from G to H.',
        price: 100000.00,
        category: 'Electronics',
        location: 'YMH, WA',
    }

    const data = { ...defaults, ...overrides }

    const { rows } = await pool.query(
        `INSERT INTO listings (title, description, price, category, location, seller_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.title, data.description, data.price, data.category, data.location, sellerId]
    )

    return rows[0]
}

export async function closePool() {
    await pool.end()
}