import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { jobs } from '../state';
import { runPipeline } from '../agent/brain';

export async function generateHandler(req: Request, res: Response) {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing "text" field in request body.' });
  }
  if (text.length > 10000) {
    return res.status(400).json({ error: 'Text exceeds 10,000 character limit.' });
  }

  const jobId = uuid().slice(0, 8);
  jobs.set(jobId, {
    id: jobId,
    status: 'parsing',
    statusText: 'Starting pipeline...',
    vnUrl: null,
  });

  if (process.env.VERCEL) {
    // Vercel: run pipeline synchronously (serverless function stays alive)
    try {
      await runPipeline(jobId, text);
      const job = jobs.get(jobId);
      res.json(job);
    } catch (err: any) {
      console.error(`[Pipeline Error] Job ${jobId}:`, err);
      res.status(500).json({ id: jobId, status: 'error', statusText: err.message || 'Unknown error', vnUrl: null });
    }
  } else {
    // Local: fire-and-forget — client polls /api/status/:id for updates
    res.status(202).json({ jobId });
    runPipeline(jobId, text).catch((err) => {
      console.error(`[Pipeline Error] Job ${jobId}:`, err);
      const job = jobs.get(jobId);
      if (job) {
        jobs.set(jobId, { ...job, status: 'error', statusText: err.message || 'Unknown error' });
      }
    });
  }
}
