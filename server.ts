import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Daily.co Room Creation API
  app.post('/api/create-room', async (req, res) => {
    try {
      const apiKey = process.env.VITE_DAILY_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'DAILY_API_KEY is not configured on the server.' });
      }

      // Create a room that expires in 1 hour
      const exp = Math.round(Date.now() / 1000) + 3600;
      
      const response = await axios.post(
        'https://api.daily.co/v1/rooms',
        {
          properties: {
            exp: exp,
            enable_chat: true,
          }
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      res.json({ url: response.data.url });
    } catch (error: any) {
      console.error('Error creating Daily room:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to create room' });
    }
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
