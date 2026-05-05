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

  // Proxy for Prayer Times to avoid CORS/Fetch issues in some environments
  app.get('/api/prayer-times', async (req, res) => {
    try {
      const { city, country, method } = req.query;
      if (!city) return res.status(400).json({ error: 'City is required' });
      
      const response = await axios.get('https://api.aladhan.com/v1/timingsByCity', {
        params: {
          city,
          country: country || 'Algeria',
          method: method || 3
        }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('Error fetching prayer times through proxy:', error.message);
      res.status(500).json({ error: 'Failed to fetch prayer times' });
    }
  });

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
