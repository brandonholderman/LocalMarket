import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '').trim() // <--- Need further explanation on this. 

    if (!token) {
        return res.status(401).json({
            error: 'Authentication required. Please login'
        })
    }

    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET)

        req.user = decode

        next()
    } catch (err) {
        return res.status(401).jason({
            error: 'Invalid or expired session. Please login again'
        })
    }



    // Authorization for non-logged in guests. Majority of site will be accessible without login. 
    export function optionalAuth(req, res, next) {
        const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '').trim()

        if (!token) {
            return next()
        }

        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET)
        } catch (err) {
            req.user = null
        }

        next()
    }


}