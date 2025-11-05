// Lightweight LLM facade (feat/subscriptions)
// Provides getModelForPlan and callGemini.
// If GEMINI_API_KEY is missing, returns deterministic demo responses (safe, zero-cost).

export type PlanMode = 'free' | 'pro' | 'elite';

export function getModelForPlan(plan: PlanMode) {
  const modelFree = process.env.MODEL_FREE || 'gemini-2.5-flash-lite';
  const modelPro = process.env.MODEL_PRO || 'gemini-2.5-flash';
  const modelElite = process.env.MODEL_ELITE || 'gemini-2.5-pro';

  if (plan === 'pro') return modelPro;
  if (plan === 'elite') return modelElite;
  return modelFree;
}

export interface CallGeminiOptions {
  model?: string;
  system_instruction?: string;
  input: string;
  stream?: boolean;
  maxTokens?: number;
}

/**
 * callGemini - lightweight wrapper
 * - If GEMINI_API_KEY is not set, returns a small deterministic demo result.
 * - If set, caller can implement real integration here (placeholder).
 */
export async function callGemini(opts: CallGeminiOptions): Promise<{ text: string; demo?: boolean }> {
  const key = process.env.GEMINI_API_KEY;
  const model = opts.model || 'demo-model';

  if (!key) {
    // Demo fallback: cheap, deterministic responses suitable for UI/testing
    const snippet = opts.input.slice(0, 180).replace(/\s+/g, ' ');
    const demoText = `DEMO_RESPONSE (${model}): Análisis simulado para: "${snippet}"`;
    return { text: demoText, demo: true };
  }

  // Real integration placeholder:
  // Implement proper call to chosen LLM provider here.
  // For now, use demo behavior to avoid accidental costs.
  // Example (pseudo): call Google/Vertex or another provider with API key.

  try {
    // TODO: replace with real SDK call
    const snippet = opts.input.slice(0, 180).replace(/\s+/g, ' ');
    const text = `LIVE_RESPONSE (${model}): processed input "${snippet}"`;
    return { text };
  } catch (e: any) {
    console.warn('[llm] call failed, returning demo fallback:', e?.message || e);
    return { text: 'LLM failed - demo fallback', demo: true };
  }
}
