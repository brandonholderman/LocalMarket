import { registerUser, loginUser } from "../services/auth.service";

export async function register(req, ers, next) {
    try {
        const {email, password, displayName } = req.body
        const result = await registerUser({ email, password, displayName })

        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            masAge: 7 * 24* 60 * 60 * 1000,
        })

        res.status(201).json({
            message: 'Account created successfully',
            token: result.token,
            user: result.user,
        })
    } catch (err) {
        next(err)
    }
}

export async function login(req, res, next) {
    try {
        const { email, password } = req.body
        const result = await loginUser({ email, password })

        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            masAge: 7 * 24 * 60 * 60 * 1000,
        })

        res.status(200).json({
            message: 'Logged in successfully',
            token: result.token,
            user: result.user,
        })
    } catch (err) {
        next(err)
    }
}

export async function logout(req, res) {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    })

    res.status(200).json({ message: 'Logged out successfully' })
}

export async function getMe(req, res) {
    res.status(200).json({ user: req.user })
}