export function errorHandler(err, req, res, next) {
    console.error(`[error] ${req.method} ${req.path}`, err)

    const statusCode = err.statusCode ?? 500

    const message = statusCode < 500 ? err : 'An unexpected error occured. Try again.'

    res.status(statusCode).json({ error: message })
}