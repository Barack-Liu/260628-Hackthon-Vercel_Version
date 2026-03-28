import { Request, Response } from 'express';
import { jobs } from '../state';

export function statusHandler(req: Request, res: Response) {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
}
