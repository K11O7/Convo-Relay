const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

// userId -> ws
const clients = new Map();

console.log(`Relay server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  let currentUserId = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'auth') {
        currentUserId = msg.userId;
        clients.set(currentUserId, ws);
        console.log(`Auth: ${currentUserId}`);
        return;
      }

      if (msg.type === 'message') {
        const payload = msg.data;
        const receiverSocket = clients.get(payload.receiverId);

        if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
          receiverSocket.send(JSON.stringify({
            type: 'message',
            data: payload,
          }));

          ws.send(JSON.stringify({
            type: 'ack',
            messageId: payload.messageId,
            status: 'delivered',
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'ack',
            messageId: payload.messageId,
            status: 'failed',
          }));
        }

        return;
      }
    } catch (err) {
      console.error('Bad packet:', err);
    }
  });

  ws.on('close', () => {
    if (currentUserId) {
      clients.delete(currentUserId);
      console.log(`Disconnected: ${currentUserId}`);
    }
  });
}); 
