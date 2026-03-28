import axios, { AxiosInstance } from 'axios';

const BASE = process.env.DIFY_API_BASE || 'https://api.dify.ai/v1';

function makeClient(apiKey: string): AxiosInstance {
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 90000,
  });
}

/**
 * Run the Novel Parser workflow (Dify App #1).
 * Input: { novel_text } → Output: { scene_graph }
 */
export async function runParserWorkflow(inputs: Record<string, string>): Promise<any> {
  const client = makeClient(process.env.DIFY_API_KEY!);
  const res = await client.post('/workflows/run', {
    inputs,
    response_mode: 'blocking',
    user: 'hongyang-agent',
  });
  return res.data.data.outputs;
}

/**
 * Run the Image Generator workflow (Dify App #2).
 * Input: { prompt } → Output: { image_url } (Array[file] from Gemini Image node)
 * The Gemini Image tool returns files, not text. We extract the URL from the first file.
 */
export async function runImageWorkflow(prompt: string): Promise<string> {
  const apiKey = process.env.DIFY_IMAGE_API_KEY;
  if (!apiKey) {
    throw new Error('DIFY_IMAGE_API_KEY not set');
  }
  const client = makeClient(apiKey);
  const res = await client.post('/workflows/run', {
    inputs: { prompt },
    response_mode: 'blocking',
    user: 'hongyang-agent',
  });

  const output = res.data.data.outputs.image_url;

  // Output is Array[file] from Gemini Image node — extract the URL
  if (Array.isArray(output) && output.length > 0) {
    // Each file object has a "url" field
    return output[0].url || output[0];
  }
  // Fallback: maybe it's already a string URL
  if (typeof output === 'string') {
    return output;
  }

  throw new Error('No image URL found in Dify image workflow output');
}
