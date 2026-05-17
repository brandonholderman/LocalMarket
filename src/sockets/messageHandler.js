import pool from '..config/db.js'
import { addConnection, removeConnection, getSocketIDs } from './connectionManager'

export function registerMessageHandlers(io, socket) {
    const userID = socket.user.id
    addConnection(userID, socket.id)

    socket.on('join_conversation', async (conversationID, acknowledge) => {
        try {
            const { rows } = await pool.query(
                `SELECT id FROM conversations
                 WHERE id = $1
                 AND (buyer_id = $2 OR seller_id = $2)`,
                [conversationID, userID]
            )

            if(rows.length === 0) {
                return acknowledge?.({ success: false, error: 'Conversation not found' })
            }

            socket.join(conversationID)
            acknowledge?.({ success: true })
        } catch (err) {
            console.error('[socket] join conversation error', err)
            acknowledge?.({ success: false, error: 'Server Error'})
        }
    })

    socket.on('leave_conversation', (conversationID) => {
        socket.leave(conversationID)
    })

    socket.on('send_message', async ({ conversationID, body }, acknowledge) => {
        try {
            if (!conversationID || !body?.trim()) {
                return acknowledge?.({ success: false, error: 'Message body required'})
            }

            const { rows: convRows } = await pool.query(
                `SELECT buyer_id, seller_id FROM conversations
                 WHERE id = $1
                 AND (buyer_id = $2 OR seller_id = $2)`,
                 [conversationID, userID]
            )

            if (convRows.length === 0) {
                return acknowledge?.({ success: false, error: 'Conversation not found'})
            }

            const { rows: msgRows } = await pool.query(
                `INSERT INTO messages (conversation_id, sender_id, body)
                 VALUES ($1, $2, $3)
                 RETURNING id, conversation_id, sender_id, body, created_at`,
                 [conversationID, userID, body.trim()]
            )

            const newMessage = msgRows[0]

            await pool.query(
                `UPDATE conversations
                 SET last_message_at = NOW()
                    last_message_preview = $1
                 WHERE id = $2`,
                 [body.trim().slice(0, 100), conversationID]
            )

            io.to(conversationID).emit('new_message', newMessage)

            const convo = convRows[0]
            const recipientID = convo.buyer_id === userID ? convo.seller_id : convo.buyer_id
            const recipientSocketIDs = getSocketIDs(recipientID)

            // for (let socketID of recipientSocketIDs) {
            //     const recipientSocket = io.sockets.sockets.get(socketID) // ??????????
            //     if (recipientSocket && )
            // }

            acknowledge?.({ success: true, message: newMessage })

        } catch (err) {
            console.error('[socket] send_messsage error: ', err)
            acknowledge?.({ success: false, error: 'Message failed to send'})
        }
    })

    socket.on('disconnect', () => {
        removeConnection(userID, socket.id)
    })
}

