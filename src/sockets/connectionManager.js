const userSockets = new Map()

export function addConnection(userID, socketID) {
    if (!userSockets.has(userID)) {
        userSockets.set(userID, new Set())
    }

    userSockets.get(userID).add(socketID)
}

export function removeConnection(userID, socketID) {
    const sockets = userSockets.get(userID)

    if (!sockets) return

    sockets.delete(socketID)

    if(sockets.size === 0) return userSockets.delete(userID)
}

export function getSocketIDs(userID) {
    return userSockets.get(userID) ?? new Set()
}

export function isOnline(userID) {
    return (userSockets.get(userID)?.size ?? 0) > 0
}