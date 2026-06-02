// Not using <-----



import { describe, it, expect, vi } from 'vitest';
import { validateBody, registerSchema, loginSchema } from '../../src/middleware/validate.js';


function mockReqRes(body) {
    const req = { body };
    const res = {
        status: vi.fn().mockReturnThis(), // .status().json() chaining
        json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();
    return { req, res, next };
}

describe('validateBody with registerSchema', () => {
    const validate = validateBody(registerSchema);

    it('calls next() when body is valid', () => {
        const { req, res, next } = mockReqRes({
            email: 'valid@example.com',
            password: 'securepassword123',
            displayName: 'Valid User',
        });

        validate(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith(); // Called with no arguments = success
        expect(res.status).not.toHaveBeenCalled();
    });

    it('replaces req.body with parsed data (trims displayName)', () => {
        const { req, res, next } = mockReqRes({
            email: 'valid@example.com',
            password: 'securepassword123',
            displayName: '  Trimmed Name  ',
        });

        validate(req, res, next);

        expect(req.body.displayName).toBe('Trimmed Name');
    });

    it('returns 400 when email is missing', () => {
        const { req, res, next } = mockReqRes({
            password: 'securepassword123',
            displayName: 'User',
        });

        validate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ fields: expect.objectContaining({ email: expect.any(Array) }) })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 when email format is invalid', () => {
        const { req, res, next } = mockReqRes({
            email: 'not-an-email',
            password: 'securepassword123',
            displayName: 'User',
        });

        validate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ fields: expect.objectContaining({ email: expect.any(Array) }) })
        );
    });

    it('returns 400 when password is shorter than 8 characters', () => {
        const { req, res, next } = mockReqRes({
            email: 'user@example.com',
            password: 'short',
            displayName: 'User',
        });

        validate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ fields: expect.objectContaining({ password: expect.any(Array) }) })
        );
    });

    it('returns 400 with errors for all invalid fields at once', () => {
        const { req, res, next } = mockReqRes({
            email: 'bad',
            password: 'x',
            displayName: 'U',
        });

        validate(req, res, next);

        const jsonCall = res.json.mock.calls[0][0];
        expect(Object.keys(jsonCall.fields)).toEqual(
            expect.arrayContaining(['email', 'password', 'displayName'])
        );
    });
});

describe('validateBody with loginSchema', () => {
    const validate = validateBody(loginSchema);

    it('calls next() for a valid login body', () => {
        const { req, res, next } = mockReqRes({
            email: 'user@example.com',
            password: 'anypassword',
        });

        validate(req, res, next);

        expect(next).toHaveBeenCalledOnce();
    });

    it('returns 400 when password is empty string', () => {
        const { req, res, next } = mockReqRes({
            email: 'user@example.com',
            password: '',
        });

        validate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
    });
});