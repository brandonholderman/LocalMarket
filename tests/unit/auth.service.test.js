import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { registerUser, loginUser, getUserById } from '../../src/services/auth.service.js';
import { cleanDatabase, closePool } from '../helpers.js';

afterAll(closePool);

describe('registerUser', () => {
    // beforeEach(cleanDatabase);

    it('creates a new user and returns a token and user object', async () => {
        const result = await registerUser({
            email: 'jane@example.com',
            password: 'securepassword123',
            displayName: 'Jane Smith',
        });

        // Token should be a non-empty string (JWT format: three dot-separated parts)
        expect(result.token).toBeDefined();
        expect(result.token.split('.')).toHaveLength(3);

        // User object should have the right shape — no password hash
        expect(result.user.email).toBe('jane@example.com');
        expect(result.user.displayName).toBe('Jane Smith');
        expect(result.user.id).toBeDefined();
        expect(result.user.passwordHash).toBeUndefined(); // Must never be returned
    });

    it('normalises email to lowercase', async () => {
        const result = await registerUser({
            email: 'JANE@EXAMPLE.COM',
            password: 'securepassword123',
            displayName: 'Jane Smith',
        });

        expect(result.user.email).toBe('jane@example.com');
    });

    it('throws 409 if email is already registered', async () => {
        await registerUser({
            email: 'jane@example.com',
            password: 'securepassword123',
            displayName: 'Jane Smith',
        });

        // Second registration with same email must throw
        await expect(
            registerUser({
                email: 'jane@example.com',
                password: 'anotherpassword',
                displayName: 'Jane Again',
            })
        ).rejects.toMatchObject({ statusCode: 409 });
    });
});

describe('loginUser', () => {
    beforeEach(async () => {
        // await cleanDatabase();
        // Seed a known user for login tests
        await registerUser({
            email: 'alex@example.com',
            password: 'testpassword123',
            displayName: 'Alex',
        });
    });

    it('returns a token and user object for valid credentials', async () => {
        const result = await loginUser({
            email: 'alex@example.com',
            password: 'testpassword123',
        });

        expect(result.token).toBeDefined();
        expect(result.user.email).toBe('alex@example.com');
    });

    it('throws 401 for wrong password', async () => {
        await expect(
            loginUser({ email: 'alex@example.com', password: 'wrongpassword' })
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 for unknown email', async () => {
        await expect(
            loginUser({ email: 'nobody@example.com', password: 'testpassword123' })
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('gives the same vague error for wrong password vs unknown email', async () => {
        // Both should throw identical messages — don't help attackers enumerate accounts
        let wrongPasswordError;
        let unknownEmailError;

        try { await loginUser({ email: 'alex@example.com', password: 'wrong' }); }
        catch (e) { wrongPasswordError = e; }

        try { await loginUser({ email: 'ghost@example.com', password: 'wrong' }); }
        catch (e) { unknownEmailError = e; }

        expect(wrongPasswordError.message).toBe(unknownEmailError.message);
    });
});

describe('getUserById', () => {
    // beforeEach(cleanDatabase);

    it('returns the user for a valid id', async () => {
        const { user } = await registerUser({
            email: 'lookup@example.com',
            password: 'password123',
            displayName: 'Lookup User',
        });

        const found = await getUserById(user.id);

        expect(found.id).toBe(user.id);
        expect(found.email).toBe('lookup@example.com');
        expect(found.password_hash).toBeUndefined(); // Not selected in the query
    });

    it('returns null for an id that does not exist', async () => {
        const result = await getUserById('00000000-0000-0000-0000-000000000000');
        expect(result).toBeNull();
    });
});