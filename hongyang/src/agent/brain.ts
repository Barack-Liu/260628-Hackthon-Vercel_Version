import { novelParser } from './skills/novel-parser';
import { imageGenerator } from './skills/image-generator';
import { vnAssembler } from './skills/vn-assembler';
import { photonDeliver } from './skills/photon-deliver';
import { storeAssets } from '../services/hydradb';
import { jobs } from '../state';

function update(id: string, status: string, statusText: string) {
  const j = jobs.get(id);
  if (j) jobs.set(id, { ...j, status: status as any, statusText });
}

export async function runPipeline(jobId: string, text: string): Promise<void> {
  console.log(`\n=== Pipeline started for job ${jobId} ===`);

  // Step 1: Parse novel → Scene Graph (Dify + GMI Cloud + HydraDB)
  update(jobId, 'parsing', 'Parsing novel with Kimi K2.5 via Dify...');
  const sceneGraph = await novelParser(text);

  // Step 2: Generate images for scenes + characters (HydraDB recall + GMI Cloud)
  update(jobId, 'generating', `Generating images for ${sceneGraph.scenes.length} scenes and ${sceneGraph.characters.length} characters...`);
  const enriched = await imageGenerator(sceneGraph);

  // Step 2b: Store generated image assets in HydraDB
  await storeAssets(enriched);

  // Step 3: Assemble HTML visual novel
  update(jobId, 'assembling', 'Assembling visual novel...');
  const vnUrl = await vnAssembler(jobId, enriched);

  // Step 4: Deliver via Photon (Discord/Telegram)
  update(jobId, 'delivering', 'Sending link to Discord...');
  await photonDeliver(vnUrl);

  // Done
  jobs.set(jobId, { id: jobId, status: 'done', statusText: 'Ready! Click Play below.', vnUrl });
  console.log(`=== Pipeline complete for job ${jobId} → ${vnUrl} ===\n`);
}
