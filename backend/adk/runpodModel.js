const { BaseLlm } = require('@google/adk');

const DEFAULT_MAX_TOKENS = Number(process.env.RUNPOD_MAX_TOKENS) || 4096;

// systemInstruction on an LlmRequest is a plain string in normal LlmAgent usage,
// but ADK's ContentUnion type also allows a Content object or array of parts -
// handle all three defensively.
function extractText(contentUnion) {
  if (!contentUnion) return '';
  if (typeof contentUnion === 'string') return contentUnion;
  if (Array.isArray(contentUnion)) {
    return contentUnion.map(extractText).join('\n');
  }
  if (contentUnion.parts) {
    return contentUnion.parts.map((p) => p.text || '').join('\n');
  }
  if (contentUnion.text) return contentUnion.text;
  return '';
}

function toOpenAiMessages(llmRequest) {
  const messages = [];
  const systemInstruction = extractText(llmRequest.config && llmRequest.config.systemInstruction);
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  for (const content of llmRequest.contents || []) {
    const role = content.role === 'model' ? 'assistant' : 'user';
    const text = (content.parts || []).map((p) => p.text || '').join('\n');
    if (text) {
      messages.push({ role, content: text });
    }
  }
  return messages;
}

/**
 * ADK BaseLlm adapter that talks to a self-hosted model on RunPod via its
 * OpenAI-compatible /chat/completions endpoint. ADK ships no non-Gemini
 * model backends, so this is the extension point it expects implementations
 * to fill in (see BaseLlm.generateContentAsync).
 */
class RunpodModel extends BaseLlm {
  constructor({ model, baseUrl, apiKey, maxTokens }) {
    super({ model });
    if (!baseUrl) throw new Error('RunpodModel requires a baseUrl (RUNPOD_BASE_URL).');
    if (!apiKey) throw new Error('RunpodModel requires an apiKey (RUNPOD_API_KEY).');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.maxTokens = maxTokens || DEFAULT_MAX_TOKENS;
  }

  async *generateContentAsync(llmRequest, stream = false, abortSignal) {
    this.maybeAppendUserContent(llmRequest);
    const messages = toOpenAiMessages(llmRequest);

    let response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2,
          max_tokens: this.maxTokens,
        }),
        signal: abortSignal,
      });
    } catch (err) {
      throw new Error(`Failed to reach RunPod endpoint: ${err.message}`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`RunPod LLM request failed (${response.status}): ${errText.slice(0, 500)}`);
    }

    const data = await response.json();
    const choice = data.choices && data.choices[0];
    const message = choice && choice.message;
    // Reasoning models served via vLLM/SGLang-style OpenAI-compatible APIs
    // (Qwen3 included) often write extended chain-of-thought into a separate
    // `reasoning_content` field, leaving `content` empty until the reasoning
    // phase finishes - on a large-context prompt the model can burn its
    // entire max_tokens budget "thinking" and never reach an actual answer,
    // so `content` comes back completely empty even though the model did
    // produce output. Falling back to `reasoning_content` means we still
    // surface *something* usable instead of a bare "no response" error.
    let text = (message && message.content) || '';
    if (!text && message && typeof message.reasoning_content === 'string' && message.reasoning_content.trim()) {
      text = message.reasoning_content;
    }

    if (!text) {
      console.warn(
        `RunpodModel: empty completion (finishReason=${choice && choice.finish_reason}, ` +
        `usage=${JSON.stringify(data.usage)}). This usually means the model ran out of ` +
        `max_tokens before producing any output - consider raising it for this call.`
      );
    }

    yield {
      content: { role: 'model', parts: [{ text }] },
      turnComplete: true,
      finishReason: choice && choice.finish_reason,
      usageMetadata: data.usage,
    };
  }

  async connect() {
    throw new Error('RunpodModel does not support live/streaming connections.');
  }
}

RunpodModel.supportedModels = [];

module.exports = { RunpodModel };
