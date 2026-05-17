import jwt from 'jsonwebtoken'

export function socketAuth(socket, next) {
    const token = socket.handsake.auth?.token
    
    if(!token) return next(new Error('Authentication Required. Missing token'))

    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET)

        socket.user = decode
        next()
    } catch(err) {
        return next(new Error('Invalid Token'))
    }
}