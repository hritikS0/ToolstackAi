const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw Object.assign(new Error("NVIDIA_API_KEY not configured"), {
      statusCode: 500,
    });
  }
  return key;
}
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  apiKey?: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<ChatCompletionResponse> {
  const apiKey = options.apiKey || getApiKey();
  const model =
    options.model ||
    process.env.NVIDIA_CHAT_MODEL ||
    "meta/llama-3.1-8b-instruct";
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 1024;

   const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    })
  });

  if(!response.ok){
    const errorBody = await response.text();
     throw Object.assign(new Error(`NVIDIA API error: ${response.status} ${errorBody}`), {
      statusCode: response.status,
    });
  }
  return response.json()  as Promise<ChatCompletionResponse>;
}

async function* chatCompletionStream(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): AsyncGenerator<string, void, unknown> {
  const apiKey = options.apiKey || getApiKey();
  const model = options.model || process.env.NVIDIA_CHAT_MODEL || "meta/llama-3.1-8b-instruct";
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 1024;

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw Object.assign(new Error(`NVIDIA API error: ${response.status} ${errorBody}`), {
      statusCode: response.status,
    });
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body for streaming");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip malformed chunks
      }
    }
  }

  return undefined;
}

export const nvidia = {
  chatCompletion,
  chatCompletionStream,
};