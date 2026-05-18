import { z } from 'zod'

export const registerSchema = z.object({
    email: z
    .string({ required_error: 'Email required' })
    .email('Must be valid email address')
    .max(255),

    password: z
    .string({ required_error: 'Password required' })
    .min(8, 'Password must be a minimum of 8 characters')
    .max(72, 'Password must be less than 72 characters'),

    displayName: z
    .string({ required_error: 'Display name required' })
    .min(3, 'Display name must be a minimum of 3 characters')
    .max(50, 'Display name must be less than 50 characters')
    .trim(),
})

export const loginSchema = z.object({
    email: z
    .string({ required_error: 'Email required' })
    .email('Must be valid email address'),

    password: z
    .string({ required_error: 'Password required' })
    .min(2, 'Invalid password')
})


export function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body)

        if (!result.success) {
            const { fieldErrors } = result.error.flatten()

            return res.status(400).json({
                error: 'Validation failed',
                fields: fieldErrors,
            })
        }

        req.body = result.data
        next()
    }
}