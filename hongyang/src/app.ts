import express from 'express';
import path from 'path';
import { generateHandler } from './api/generate';
import { statusHandler } from './api/status';
import { jobs } from './state';

const app = express();

// Middleware
app.use(express.json({ limit: '1mb' }));

// Static frontend
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.post('/api/generate', generateHandler);
app.get('/api/status/:id', statusHandler);

// Serve VN from memory (Vercel-compatible — no disk needed)
app.get('/api/vn/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job?.vnHtml) return res.status(404).send('Visual novel not found');
  res.type('html').send(job.vnHtml);
});

// Serve VN from disk (local dev)
app.use('/vn', express.static(path.join(process.cwd(), 'output')));

export default app;
