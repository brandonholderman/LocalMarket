import { describe, it, expect, afterAll } from 'vitest';
import pool, { connectDB, withTransaction } from '../../src/config/db.js';
import { cleanDatabase, closePool, createTestUser } from '../helpers.js';

afterAll(closePool);

describe('connectDB', () => {
    it('successfully connects to Postgres without throwing', async () => {
        // If this throws, your DATABASE_URL is wrong or Postgres isn't running
        await expect(connectDB()).resolves.not.toThrow();
    });
});

describe('pool.query', () => {
    it('executes a simple query and returns rows', async () => {
        const result = await pool.query('SELECT 1 + 1 AS sum');
        expect(result.rows[0].sum).toBe(2);
    });

    it('safely handles parameterised queries', async () => {
        const result = await pool.query('SELECT $1::text AS value', ['hello']);
        expect(result.rows[0].value).toBe('hello');
    });
});

describe('withTransaction', () => {
    it('commits when the callback succeeds', async () => {
        await cleanDatabase();

        await withTransaction(async (client) => {
            await client.query(
                `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)`,
                ['tx@example.com', 'fakehash', 'TX User']
            );
        });

        // Row should exist after commit
        const { rows } = await pool.query(
            'SELECT email FROM users WHERE email = $1',
            ['tx@example.com']
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].email).toBe('tx@example.com');
    });

    it('rolls back all changes when the callback throws', async () => {
        await cleanDatabase();

        await expect(
            withTransaction(async (client) => {
                // First write — would succeed on its own
                await client.query(
                    `INSERT INTO users (email, password_hash, display_name)
           VALUES ($1, $2, $3)`,
                    ['rollback@example.com', 'fakehash', 'Rollback User']
                );

                // Deliberately throw to trigger rollback
                throw new Error('Simulated failure');
            })
        ).rejects.toThrow('Simulated failure');

        // Row must NOT exist — the whole transaction was rolled back
        const { rows } = await pool.query(
            'SELECT email FROM users WHERE email = $1',
            ['rollback@example.com']
        );

        expect(rows).toHaveLength(0);
    });

    it('re-throws the original error after rolling back', async () => {
        const error = new Error('Something went wrong');
        error.statusCode = 422;

        await expect(
            withTransaction(async () => { throw error; })
        ).rejects.toMatchObject({ message: 'Something went wrong', statusCode: 422 });
    });

    it('returns the value from the callback on success', async () => {
        await cleanDatabase();

        const result = await withTransaction(async (client) => {
            const { rows } = await client.query(
                `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3) RETURNING id, email`,
                ['return@example.com', 'fakehash', 'Return User']
            );
            return rows[0];
        });

        expect(result.email).toBe('return@example.com');
        expect(result.id).toBeDefined();
    });
});