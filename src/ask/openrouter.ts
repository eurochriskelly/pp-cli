import type { AskMessage, OpenRouterCompletion } from './types.js';

const DEFAULT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export type AskToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export async function completeWithOpenRouter(input: {
  apiKey: string;
  model: string;
  messages: AskMessage[];
  tools: AskToolDefinition[];
}): Promise<OpenRouterCompletion> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  const endpoint = process.env.OPENROUTER_API_URL || DEFAULT_ENDPOINT;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pitchperfect.io',
        'X-Title': 'PitchPerfect ppx ask',
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        tools: input.tools,
        tool_choice: 'auto',
        parallel_tool_calls: false,
        temperature: 0.1,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });
    const body = await response.json() as OpenRouterCompletion;
    if (!response.ok) {
      throw new Error(body.error?.message || `OpenRouter returned HTTP ${response.status}`);
    }
    return body;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('OpenRouter request timed out after 90 seconds');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
