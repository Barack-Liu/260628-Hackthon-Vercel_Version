import axios from 'axios';

const GMI = axios.create({
  baseURL: process.env.GMI_API_BASE || 'https://api.gmi-serving.com/v1',
  headers: { Authorization: `Bearer ${process.env.GMI_API_KEY}` },
  timeout: 90000,
});

const MODEL = process.env.GMI_MODEL || 'moonshotai/Kimi-K2.5';

export async function chatCompletion(system: string, user: string): Promise<string> {
  const res = await GMI.post('/chat/completions', {
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });
  return res.data.choices[0].message.content;
}

// GMI Cloud is LLM-only — no native image generation endpoint.
// For Phase 1, we generate descriptive placeholder images via a free service.
// The prompt is still constructed so Phase 2 can swap in a real image API.
export async function generateImage(prompt: string): Promise<string> {
  try {
    // Use pollinations.ai — free, no-auth AI image generation
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&nologo=true`;

    // Verify it's reachable (HEAD request)
    await axios.head(url, { timeout: 15000 });
    return url;
  } catch (err: any) {
    console.warn(`[Image] Pollinations failed, using placeholder: ${err.message}`);
    // Fallback: colored placeholder with scene text
    const label = encodeURIComponent(prompt.slice(0, 40));
    return `https://placehold.co/1280x720/2C3E50/ECF0F1?text=${label}`;
  }
}
