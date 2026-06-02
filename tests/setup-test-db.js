import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// dotenv.config({ path: '.env.test' });

const { Pool } = pg;


async function createTestDatabase() {
    const adminPool = new Pool({
        connectionString: process.env.TEST_DB_URL,
    });

    try {
        // Check if marketplace_test already exists
        const { rows } = await adminPool.query(
            `SELECT 1 FROM pg_database WHERE datname = 'marketplace_test'`
        );

        if (rows.length > 0) {
            console.log('✓ Database marketplace_test already exists — skipping creation.');
        } else {
            await adminPool.query('CREATE DATABASE marketplace_test');
            console.log('✓ Created database: marketplace_test');
        }
    } finally {
        await adminPool.end();
    }
}



async function runMigrations(pool) {
    console.log('\nRunning migrations...');

    // Enable UUID generation
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Users
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      email          TEXT        NOT NULL UNIQUE,
      password_hash  TEXT        NOT NULL,
      display_name   TEXT        NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)
  `);
    console.log('  ✓ users');

    // Listings
    await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      title        TEXT        NOT NULL,
      description  TEXT        NOT NULL,
      price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
      category     TEXT        NOT NULL,
      location     TEXT        NOT NULL,
      seller_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS listings_category_idx  ON listings (category);
  `);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS listings_seller_idx    ON listings (seller_id);
  `);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS listings_created_idx   ON listings (created_at DESC);
  `);
    console.log('  ✓ listings');

    // Conversations
    await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id            UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      buyer_id              UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      seller_id             UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      last_message_at       TIMESTAMPTZ,
      last_message_preview  TEXT,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 
      -- Prevent duplicate conversations between the same buyer and seller
      -- about the same listing
      CONSTRAINT unique_conversation UNIQUE (listing_id, buyer_id, seller_id)
    )
  `);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS conversations_buyer_idx  ON conversations (buyer_id);
  `);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS conversations_seller_idx ON conversations (seller_id);
  `);
    console.log('  ✓ conversations');

    // Messages
    await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id  UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id        UUID        NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
      body             TEXT        NOT NULL CHECK (char_length(body) > 0),
      read_at          TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);
  `);
    console.log('  ✓ messages');
}



// Fixed IDs — import these into test files when you need to reference
// a specific record without a DB lookup.
export const TEST_IDS = {
    // Users
    SELLER_ID: 'aaaaaaaa-0000-4000-8000-000000000001',
    BUYER_ID: 'aaaaaaaa-0000-4000-8000-000000000002',
    VIEWER_ID: 'aaaaaaaa-0000-4000-8000-000000000003', // No messages — for permission tests

    // Listings
    LISTING_ELECTRONICS_ID: 'bbbbbbbb-0000-4000-8000-000000000001',
    LISTING_FURNITURE_ID: 'bbbbbbbb-0000-4000-8000-000000000002',
    LISTING_INACTIVE_ID: 'bbbbbbbb-0000-4000-8000-000000000003',

    // Conversations
    CONVERSATION_ID: 'cccccccc-0000-4000-8000-000000000001',

    // Messages
    MESSAGE_1_ID: 'dddddddd-0000-4000-8000-000000000001',
    MESSAGE_2_ID: 'dddddddd-0000-4000-8000-000000000002',
    MESSAGE_3_ID: 'dddddddd-0000-4000-8000-000000000003',
};

// Plain-text passwords for each test user — use these in login tests
export const TEST_PASSWORDS = {
    SELLER: 'SellerPass123',
    BUYER: 'BuyerPass456',
    VIEWER: 'ViewerPass789',
};

async function seedData(pool) {
    console.log('\nSeeding test data...');


    await pool.query('DELETE FROM messages');
    await pool.query('DELETE FROM conversations');
    await pool.query('DELETE FROM listings');
    await pool.query('DELETE FROM users');
    console.log('  ✓ Cleared existing data');


    const sellerHash = await bcrypt.hash(TEST_PASSWORDS.SELLER, 12);
    const buyerHash = await bcrypt.hash(TEST_PASSWORDS.BUYER, 12);
    const viewerHash = await bcrypt.hash(TEST_PASSWORDS.VIEWER, 12);

    await pool.query(`
    INSERT INTO users (id, email, password_hash, display_name, created_at)
    VALUES
      ($1, 'seller@example.com',  $4, 'Alex Rivera',  '2025-01-10 09:00:00+00'),
      ($2, 'buyer@example.com',   $5, 'Sam Chen',     '2025-01-15 11:00:00+00'),
      ($3, 'viewer@example.com',  $6, 'Jordan Blake',  '2025-01-20 14:00:00+00')
  `, [
        TEST_IDS.SELLER_ID, TEST_IDS.BUYER_ID, TEST_IDS.VIEWER_ID,
        sellerHash, buyerHash, viewerHash,
    ]);
    console.log('  ✓ Users (seller, buyer, viewer)');


    await pool.query(`
    INSERT INTO listings
      (id, title, description, price, category, location, seller_id, is_active, created_at)
    VALUES
      (
        $1,
        'Sony WH-1000XM4 Wireless Headphones',
        'Excellent noise-cancelling headphones. Purchased January 2024, lightly used. '
        'Comes with original case, USB-C cable, and 3.5mm audio cable. '
        'Battery holds full charge. Minor desk scratches on right cup.',
        175.00,
        'Electronics',
        'Seattle, WA — Capitol Hill',
        $4,
        TRUE,
        '2025-05-01 10:00:00+00'
      ),
      (
        $2,
        'Mid-Century Modern Dining Table',
        'Solid walnut dining table, seats 6. Purchased from West Elm three years ago. '
        'Some light scuffs on the surface but structurally perfect. '
        'Moving across the country — must sell. Dimensions: 72" x 36" x 30".',
        320.00,
        'Furniture',
        'Seattle, WA — Fremont',
        $4,
        TRUE,
        '2025-05-05 14:30:00+00'
      ),
      (
        $3,
        'Broken MacBook Pro 2019 — For Parts',
        'Water damaged MacBook Pro 13" 2019. Does not boot. Selling as-is for parts. '
        'Screen appears intact. Keyboard untested.',
        75.00,
        'Electronics',
        'Seattle, WA — Ballard',
        $4,
        FALSE,  -- inactive listing — useful for testing filtering and access control
        '2025-04-15 09:00:00+00'
      )
  `, [
        TEST_IDS.LISTING_ELECTRONICS_ID,
        TEST_IDS.LISTING_FURNITURE_ID,
        TEST_IDS.LISTING_INACTIVE_ID,
        TEST_IDS.SELLER_ID,
    ]);
    console.log('  ✓ Listings (electronics active, furniture active, electronics inactive)');


    await pool.query(`
    INSERT INTO conversations
      (id, listing_id, buyer_id, seller_id, last_message_at, last_message_preview, created_at)
    VALUES
      (
        $1, $2, $3, $4,
        '2025-05-10 16:45:00+00',
        'Does it come with the original box?',
        '2025-05-10 16:30:00+00'
      )
  `, [
        TEST_IDS.CONVERSATION_ID,
        TEST_IDS.LISTING_ELECTRONICS_ID,
        TEST_IDS.BUYER_ID,
        TEST_IDS.SELLER_ID,
    ]);
    console.log('  ✓ Conversations (1 active thread)');


    await pool.query(`
    INSERT INTO messages (id, conversation_id, sender_id, body, read_at, created_at)
    VALUES
      (
        $1, $4, $5,
        'Hi! Is this still available? Would you take $150?',
        '2025-05-10 16:35:00+00',  -- seller has read this
        '2025-05-10 16:30:00+00'
      ),
      (
        $2, $4, $6,
        'Still available yes. Best I can do is $165 — it''s basically brand new.',
        '2025-05-10 16:47:00+00',  -- buyer has read this
        '2025-05-10 16:35:00+00'
      ),
      (
        $3, $4, $5,
        'Does it come with the original box?',
        NULL,                       -- seller has NOT read this yet (unread)
        '2025-05-10 16:45:00+00'
      )
  `, [
        TEST_IDS.MESSAGE_1_ID,
        TEST_IDS.MESSAGE_2_ID,
        TEST_IDS.MESSAGE_3_ID,
        TEST_IDS.CONVERSATION_ID,
        TEST_IDS.BUYER_ID,
        TEST_IDS.SELLER_ID,
    ]);
    console.log('  ✓ Messages (3 messages — realistic back-and-forth)');
}



async function verifySeed(pool) {
    console.log('\nVerifying seed...');

    const { rows: users } = await pool.query('SELECT COUNT(*) FROM users');
    const { rows: listings } = await pool.query('SELECT COUNT(*) FROM listings');
    const { rows: conversations } = await pool.query('SELECT COUNT(*) FROM conversations');
    const { rows: messages } = await pool.query('SELECT COUNT(*) FROM messages');

    console.log(`  users:         ${users[0].count}`);
    console.log(`  listings:      ${listings[0].count}`);
    console.log(`  conversations: ${conversations[0].count}`);
    console.log(`  messages:      ${messages[0].count}`);

    // Spot-check a join to confirm foreign keys are wired up correctly
    const { rows: check } = await pool.query(`
    SELECT
      u.display_name  AS seller,
      l.title         AS listing,
      m.body          AS latest_message
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    JOIN users u         ON u.id = c.seller_id
    JOIN listings l      ON l.id = c.listing_id
    ORDER BY m.created_at DESC
    LIMIT 1
  `);

    if (check.length > 0) {
        console.log(`\n  Sample join check:`);
        console.log(`    Seller:  ${check[0].seller}`);
        console.log(`    Listing: ${check[0].listing}`);
        console.log(`    Latest:  "${check[0].latest_message}"`);
    }
}


async function main() {
    console.log('='.repeat(60));
    console.log('  Marketplace — Test Database Setup');
    console.log('='.repeat(60));
    console.log(`\nTarget: ${process.env.DATABASE_URL}`);

    // Phase 1: create the database (uses admin connection)
    await createTestDatabase();

    // Phase 2: connect to marketplace_test for everything else
    const pool = new Pool({ connectionString: process.env.TEST_DB_URL });

    try {
        await runMigrations(pool);
        await seedData(pool);
        await verifySeed(pool);

        console.log('\n' + '='.repeat(60));
        console.log('  Setup complete. Run npm test to execute the test suite.');
        console.log('='.repeat(60) + '\n');
    } catch (err) {
        console.error('\n✗ Setup failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();