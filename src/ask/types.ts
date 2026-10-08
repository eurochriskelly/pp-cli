export type AskMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: AskToolCall[];
};

export type AskToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type AskUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AskAttachment = {
  id: string;
  originalName: string;
  path: string;
  size: number;
};

export type AskSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  messages: AskMessage[];
  attachments: AskAttachment[];
  usage: AskUsage;
};

export type OpenRouterCompletion = {
  choices?: Array<{
    finish_reason?: string;
    message?: AskMessage;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};
