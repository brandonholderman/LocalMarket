import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server.js'; // Express app exported separately (see note below)
import { cleanDatabase, closePool } from '../helpers.js';

afterAll(closePool);



describe('POST /api/auth/register', () => {
    // beforeEach(cleanDatabase);

    it('registers a new user and returns 201 with token and user', async () => {
        const res = await request(app)
            .post('/api/auth/register') // TODO: Fix these routes since they don't exist
            .send({
                email: 'newuser@example.com',
                password: 'securepassword123',
                displayName: 'New User',
            });

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe('newuser@example.com');
        expect(res.body.user.displayName).toBe('New User');

        // Cookie should be set
        expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 400 if email is invalid', async () => {
        const res = await request(app)
            .post('/api/auth/register') // TODO: fix routes
            .send({
                email: 'not-an-email',
                password: 'securepassword123',
                displayName: 'User',
            });

        expect(res.status).toBe(400);
        expect(res.body.fields.email).toBeDefined();
    });

    it('returns 400 if password is too short', async () => {
        const res = await request(app)
            .post('/api/auth/register') // TODO: fix routes
            .send({
                email: 'user@example.com',
                password: 'short',
                displayName: 'User',
            });

        expect(res.status).toBe(400);
        expect(res.body.fields.password).toBeDefined();
    });

    it('returns 400 if displayName is missing', async () => {
        const res = await request(app)
            .post('/api/auth/register') // TODO: fix routes
            .send({
                email: 'user@example.com',
                password: 'securepassword123',
                // displayName omitted
            });

        expect(res.status).toBe(400);
        expect(res.body.fields.displayName).toBeDefined();
    });

    it('returns 409 if email is already registered', async () => {
        // Register once
        await request(app)
            .post('/api/auth/register')
            .send({ email: 'taken@example.com', password: 'password123', displayName: 'First' });

        // Try again with same email
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'taken@example.com', password: 'password456', displayName: 'Second' });

        expect(res.status).toBe(409);
    });
});



describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        // await cleanDatabase();
        await request(app)
            .post('/api/auth/register') // TODO: fix routes
            .send({ email: 'login@example.com', password: 'testpassword123', displayName: 'Login User' });
    });

    it('logs in with valid credentials and returns 200 with token', async () => {
        const res = await request(app)
            .post('/api/auth/login') // TODO: fix routes
            .send({ email: 'login@example.com', password: 'testpassword123' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe('login@example.com');
    });

    it('returns 401 for wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login') // TODO: fix routes
            .send({ email: 'login@example.com', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.token).toBeUndefined();
    });

    it('returns 401 for unknown email', async () => {
        const res = await request(app)
            .post('/api/auth/login') // TODO: fix routes
            .send({ email: 'ghost@example.com', password: 'testpassword123' });

        expect(res.status).toBe(401);
    });
});



describe('POST /api/auth/logout', () => {
    it('returns 200 and clears the cookie', async () => {
        const res = await request(app).post('/api/auth/logout');

        expect(res.status).toBe(200);

        // The Set-Cookie header should clear the token cookie
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies.some(c => c.startsWith('token=;'))).toBe(true);
    });
});



describe('GET /api/auth/me', () => {
    it('returns the current user when a valid token is sent', async () => {
        // Register and grab the token
        const registerRes = await request(app)
            .post('/api/auth/register') // TODO: fix routes
            .send({ email: 'me@example.com', password: 'password123', displayName: 'Me User' });

        const { token } = registerRes.body;

        const res = await request(app)
            .get('/api/auth/me') // TODO: fix routes
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('me@example.com');
    });

    it('returns 401 when no token is provided', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    it('returns 401 when a malformed token is provided', async () => {
        const res = await request(app)
            .get('/api/auth/me') // TODO: fix routes
            .set('Authorization', 'Bearer this.is.notvalid');

        expect(res.status).toBe(401);
    });
});