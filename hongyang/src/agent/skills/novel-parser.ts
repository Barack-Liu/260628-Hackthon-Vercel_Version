import { runParserWorkflow } from '../../services/dify';
import { chatCompletion } from '../../services/gmi-cloud';
import { storeCharacters } from '../../services/hydradb';
import { SceneGraph } from '../../types/scene-graph';

const SYSTEM_PROMPT = `You are a visual novel director. Given novel text, extract a structured scene graph as JSON.

## JSON Schema
{
  "title": "string",
  "characters": [{
    "id": "char_XX", "name": "string",
    "description": "detailed physical appearance + personality",
    "image_prompt": "anime style portrait prompt with visual details"
  }],
  "scenes": [{
    "id": "scene_XX",
    "location": "string",
    "time_of_day": "morning|afternoon|evening|night|twilight",
    "mood": "tense|romantic|calm|action|mysterious|sad|joyful",
    "background_prompt": "anime style 16:9 background prompt",
    "dialogue": [{ "speaker": "char_XX or narrator", "text": "string" }],
    "next_scene": "scene_XX or null"
  }]
}

## Rules
- 5-8 scenes max. LINEAR progression, no branching.
- 3-8 dialogue lines per scene.
- Character descriptions CONSISTENT across scenes.
- image_prompt fields: "anime style" + enough visual detail.
- Output ONLY valid JSON. No markdown, no explanation, no code fences.`;

/**
 * Strip markdown code fences and extract JSON from LLM output.
 */
function extractJson(raw: string): string {
  let s = raw.trim();
  // Remove ```json ... ``` wrapping
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) s = fenceMatch[1].trim();
  // Remove leading/trailing non-JSON chars
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    s = s.substring(firstBrace, lastBrace + 1);
  }
  return s;
}

/**
 * Validate and normalize a parsed scene graph.
 */
function normalize(obj: any): SceneGraph {
  const graph: SceneGraph = {
    title: obj.title || 'Untitled',
    characters: Array.isArray(obj.characters) ? obj.characters : [],
    scenes: Array.isArray(obj.scenes) ? obj.scenes : [],
  };

  // Ensure image_url fields exist
  for (const c of graph.characters) {
    c.image_url = c.image_url ?? null;
  }
  for (const s of graph.scenes) {
    s.background_url = s.background_url ?? null;
    s.dialogue = Array.isArray(s.dialogue) ? s.dialogue : [];
  }

  if (graph.scenes.length === 0) {
    throw new Error('No scenes extracted from novel text');
  }

  return graph;
}

export async function novelParser(text: string): Promise<SceneGraph> {
  let rawJson: string;

  try {
    // Primary path: use Dify workflow (shows Dify integration to judges)
    const result = await runParserWorkflow({ novel_text: text });
    rawJson = typeof result.scene_graph === 'string'
      ? result.scene_graph
      : JSON.stringify(result.scene_graph);
  } catch (err: any) {
    console.warn('[novel-parser] Dify workflow failed, falling back to direct GMI Cloud call:', err.message);
    // Fallback: call GMI Cloud directly (still shows GMI integration)
    rawJson = await chatCompletion(SYSTEM_PROMPT, text);
  }

  console.log('[novel-parser] Raw response length:', rawJson.length, '| First 200 chars:', rawJson.substring(0, 200));

  let graph: SceneGraph;
  try {
    const cleaned = extractJson(rawJson);
    graph = normalize(JSON.parse(cleaned));
  } catch (parseErr: any) {
    // Retry with stricter instruction
    console.warn('[novel-parser] JSON parse failed:', parseErr.message, '— retrying with stricter prompt...');
    rawJson = await chatCompletion(
      SYSTEM_PROMPT + '\n\nCRITICAL: Output ONLY valid JSON. No markdown code fences. No text before or after the JSON object.',
      text
    );
    const cleaned = extractJson(rawJson);
    graph = normalize(JSON.parse(cleaned));
  }

  // Store characters to HydraDB for consistency
  await storeCharacters(graph.characters);

  console.log(`[novel-parser] Extracted ${graph.scenes.length} scenes, ${graph.characters.length} characters.`);
  return graph;
}
