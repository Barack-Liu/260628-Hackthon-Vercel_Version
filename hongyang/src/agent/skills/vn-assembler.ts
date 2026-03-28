import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { SceneGraph } from '../../types/scene-graph';
import { jobs } from '../../state';

const TEMPLATE_PATH = path.join(__dirname, '../../templates/vn-player.html');

export async function vnAssembler(jobId: string, graph: SceneGraph): Promise<string> {
  const src = await fs.readFile(TEMPLATE_PATH, 'utf-8');
  const template = Handlebars.compile(src);
  const html = template({
    title: graph.title || 'Hongyang Visual Novel',
    sceneDataJSON: JSON.stringify(graph),
  });

  // Store HTML in memory (works on Vercel where disk is ephemeral)
  const job = jobs.get(jobId);
  if (job) jobs.set(jobId, { ...job, vnHtml: html });

  // Also write to disk for local dev (non-blocking — OK if this fails on Vercel)
  try {
    const dir = path.join(process.cwd(), 'output', jobId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), html, 'utf-8');
    console.log(`[vn-assembler] Written to output/${jobId}/index.html`);
  } catch {
    console.log(`[vn-assembler] Disk write skipped (serverless mode).`);
  }

  // On Vercel, serve from memory via API route; locally, serve from disk
  return process.env.VERCEL ? `/api/vn/${jobId}` : `/vn/${jobId}/index.html`;
}
