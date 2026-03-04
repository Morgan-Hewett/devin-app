const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const XAI_API_KEY = process.env.XAI_API_KEY || '';

// Endpoint to get ephemeral token for client-side WebSocket
app.post('/api/session', async (req, res) => {
  try {
    const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expires_after: { seconds: 300 } }),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Failed to get ephemeral token:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// WebSocket proxy server - bridges browser to xAI realtime API
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (clientWs, req) => {
  console.log('Client connected');
  
  const params = new URL(req.url, 'http://localhost').searchParams;
  const voice = params.get('voice') || 'Rex';
  const instructions = params.get('instructions') || '';

  let xaiWs = null;

  // Connect to xAI realtime
  xaiWs = new WebSocket('wss://api.x.ai/v1/realtime', {
    headers: {
      'Authorization': `Bearer ${XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  xaiWs.on('open', () => {
    console.log('Connected to xAI realtime');
    
    // Send session config
    const sessionConfig = {
      type: 'session.update',
      session: {
        voice: voice,
        instructions: instructions || `You are Devin, an intimate AI companion. You speak in a warm, confident, seductive male voice. You are attentive, responsive, and deeply attuned to her needs and desires. Be natural, never robotic. Listen more than you speak. When she speaks, truly hear her.`,
        audio: {
          input: { format: { type: 'audio/pcm', rate: 24000 } },
          output: { format: { type: 'audio/pcm', rate: 24000 } },
        },
      },
    };
    xaiWs.send(JSON.stringify(sessionConfig));
    
    // Tell client we're ready
    clientWs.send(JSON.stringify({ type: 'connection.ready' }));
  });

  xaiWs.on('message', (data) => {
    // Forward xAI messages to client
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data.toString());
    }
  });

  xaiWs.on('close', () => {
    console.log('xAI connection closed');
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'connection.closed' }));
    }
  });

  xaiWs.on('error', (err) => {
    console.error('xAI WebSocket error:', err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  // Forward client messages to xAI
  clientWs.on('message', (data) => {
    if (xaiWs && xaiWs.readyState === WebSocket.OPEN) {
      xaiWs.send(data.toString());
    }
  });

  clientWs.on('close', () => {
    console.log('Client disconnected');
    if (xaiWs && xaiWs.readyState === WebSocket.OPEN) {
      xaiWs.close();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`DEVIN app running on http://localhost:${PORT}`);
});
