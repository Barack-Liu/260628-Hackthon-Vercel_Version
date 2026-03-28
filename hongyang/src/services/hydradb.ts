import axios from 'axios';
import FormData from 'form-data';
import { Character, SceneGraph } from '../types/scene-graph';

const HDB_BASE = process.env.HYDRADB_API_BASE || 'https://api.hydradb.com';
const HDB_KEY = process.env.HYDRADB_API_KEY || '';
const TENANT_ID = process.env.HYDRADB_TENANT_ID || 'hongyang';

const HDB = axios.create({
  baseURL: HDB_BASE,
  headers: { Authorization: `Bearer ${HDB_KEY}` },
  timeout: 15000,
});

export async function storeCharacters(chars: Character[]): Promise<void> {
  const memories = chars.map(c => ({
    text: `Character: ${c.name}. ${c.description}`,
    title: `Character Profile: ${c.name}`,
  }));

  try {
    await HDB.post('/memories/add_memory', {
      tenant_id: TENANT_ID,
      memories,
    });
    console.log(`[HydraDB] Stored ${chars.length} character profiles.`);
  } catch (err: any) {
    console.warn('[HydraDB] Failed to store characters:', err.response?.data?.detail || err.message);
  }
}

/**
 * Store generated image assets (portraits + backgrounds) in HydraDB
 * as knowledge via /ingestion/upload_knowledge (multipart form with
 * app_sources) so they appear in the Knowledge dashboard.
 */
export async function storeAssets(graph: SceneGraph): Promise<void> {
  const appSources: any[] = [];

  for (const char of graph.characters) {
    if (char.image_url) {
      appSources.push({
        id: `portrait_${char.id}`,
        tenant_id: TENANT_ID,
        sub_tenant_id: 'default',
        title: `Portrait: ${char.name}`,
        source: 'dify-image-gen',
        description: `Character portrait for ${char.name}. ${char.description}`,
        url: char.image_url,
        content: { text: `Character portrait for ${char.name}.\nDescription: ${char.description}` },
      });
    }
  }

  for (const scene of graph.scenes) {
    if (scene.background_url) {
      appSources.push({
        id: `background_${scene.id}`,
        tenant_id: TENANT_ID,
        sub_tenant_id: 'default',
        title: `Background: ${scene.location}`,
        source: 'dify-image-gen',
        description: `Scene background at ${scene.location}, ${scene.mood} mood, ${scene.time_of_day}`,
        url: scene.background_url,
        content: { text: `Scene background for ${scene.id} at ${scene.location}.\nMood: ${scene.mood}, Time: ${scene.time_of_day}` },
      });
    }
  }

  if (appSources.length === 0) return;

  try {
    const form = new FormData();
    form.append('tenant_id', TENANT_ID);
    form.append('app_sources', JSON.stringify(appSources));

    await HDB.post('/ingestion/upload_knowledge', form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${HDB_KEY}` },
      timeout: 30000,
    });
    console.log(`[HydraDB] Stored ${appSources.length} image assets as knowledge (${graph.characters.length} portraits + ${graph.scenes.length} backgrounds).`);
  } catch (err: any) {
    console.warn('[HydraDB] Failed to store assets:', err.response?.data?.detail || err.message);
  }
}

export async function recallCharacter(name: string): Promise<string> {
  try {
    const res = await HDB.post('/recall/full_recall', {
      tenant_id: TENANT_ID,
      query: `Visual appearance of character ${name}`,
    });
    const chunks = res.data.chunks;
    return Array.isArray(chunks) && chunks.length > 0 ? chunks[0].text || chunks[0] : '';
  } catch (err: any) {
    console.warn(`[HydraDB] Failed to recall ${name}:`, err.response?.data?.detail || err.message);
    return '';
  }
}
