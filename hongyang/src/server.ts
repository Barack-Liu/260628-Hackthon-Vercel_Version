import 'dotenv/config';
import app from './app';
import { startWatcher } from './services/photon';
import { runPipeline } from './agent/brain';
import { v4 as uuid } from 'uuid';
import { jobs } from './state';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🎮  HONGYANG — Visual Novel Agent          ║
║                                              ║
║   http://localhost:${PORT}                      ║
║                                              ║
║   Sponsor stack:                             ║
║   • GMI Cloud (Kimi K2.5 LLM)                 ║
║   • Dify (Parser + Image Gen Workflows)       ║
║   • HydraDB (Memory Layer)                   ║
║   • Photon (iMessage Delivery)               ║
║                                              ║
╚══════════════════════════════════════════════╝
  `);

  // Start Photon iMessage watcher for two-way VN generation.
  // Users can text novel excerpts to this Mac and receive a VN link back.
  startWatcher(async (text) => {
    const jobId = uuid().slice(0, 8);
    jobs.set(jobId, { id: jobId, status: 'parsing', statusText: 'Starting...', vnUrl: null });
    await runPipeline(jobId, text);
    const job = jobs.get(jobId);
    return `http://localhost:${PORT}${job?.vnUrl || ''}`;
  }).catch(() => {});
});
