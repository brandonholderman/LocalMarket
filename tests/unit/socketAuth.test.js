import { describe, it, expect, beforeAll } from 'vitest';
import { socketAuth } from '../../src/sockets/socketAuth.js';
import jwt from 'jsonwebtoken';
// import env from '.env.test';
import { resolve } from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: resolve(process.cwd(), '.env.test') });

// A valid signed token used across tests
let validToken;

beforeAll(() => {
    validToken = jwt.sign(
        { id: 'user-123', email: 'test@example.com', display_name: 'Test User' },
        process.env.TEST_JWT_SECRET,
        { expiresIn: '1h' }
    );
});


function mockSocket(token) {
    return {
        handshake: {
            auth: token !== undefined ? { token } : {},
        },
        user: null,
    };
}

describe('socketAuth middleware', () => {
    it('calls next() without error when token is valid', () => {
        const socket = mockSocket(validToken);
        const next = (err) => {
            expect(err).toBeUndefined(); // next() called with no argument = success
        };

        socketAuth(socket, next);
        expect(socket.user).not.toBeNull();
        expect(socket.user.id).toBe('user-123');
    });

    it('attaches decoded user to socket.user on success', () => {
        const socket = mockSocket(validToken);
        let nextCalled = false;

        socketAuth(socket, (err) => {
            if (!err) nextCalled = true;
        });

        expect(nextCalled).toBe(true);
        expect(socket.user.email).toBe('test@example.com');
        expect(socket.user.display_name).toBe('Test User');
    });

    it('calls next(Error) when no token is provided', () => {
        const socket = mockSocket(undefined);

        socketAuth(socket, (err) => {
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toMatch(/authentication required/i);
        });
    });

    it('calls next(Error) when token is malformed', () => {
        const socket = mockSocket('this.is.not.a.valid.token');

        socketAuth(socket, (err) => {
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toMatch(/invalid or expired/i);
        });
    });

    it('calls next(Error) when token is expired', () => {
        const expiredToken = jwt.sign(
            { id: 'user-123', email: 'test@example.com' },
            process.env.TEST_JWT_SECRET,
            { expiresIn: '-1s' } // Already expired
        );

        const socket = mockSocket(expiredToken);

        socketAuth(socket, (err) => {
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toMatch(/invalid or expired/i);
        });
    });

    it('calls next(Error) when token is signed with wrong secret', () => {
        const wrongToken = jwt.sign(
            { id: 'user-123' },
            'completely-wrong-secret',
            { expiresIn: '1h' }
        );

        const socket = mockSocket(wrongToken);

        socketAuth(socket, (err) => {
            expect(err).toBeInstanceOf(Error);
        });
    });
});