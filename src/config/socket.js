import { Server } from 'socket.io'

let io;

export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        }
    })

    // io.use(socketAuth) <----- Adding this later.

    io.on('connection', (socket) => {
        console.log(`[socket] Connected: ${socket.id} (user: ${socket.user.id})`)

        // registerMessageHandlers(io, socket) <---- Adding this later
        
        /** Example message handler
        socket.on('chat message', (msg) => {
            console.log('Message received:', msg);
            // Broadcast the message to everyone
            io.emit('chat message', msg);
        });
        */

        socket.on('disconnect', () => {
            console.log(`[socket] Disconnected: ${socket.id}`)
        })
    })
}

export function getIO() {
    if (!io) {
        throw new Error('Socket has not been initialized. Call initSocket() first')
    }
    return io
}
