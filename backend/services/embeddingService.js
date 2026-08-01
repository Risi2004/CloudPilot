const EMBED_BATCH_SIZE = 16;

class EmbeddingError extends Error {}

function getConfig() {
  const baseUrl = process.env.RUNPOD_BASE_URL;
  const apiKey = process.env.RUNPOD_API_KEY;
  const model = process.env.RUNPOD_EMBED_MODEL || 'nomic-embed-text';

  if (!baseUrl || !apiKey) {
    throw new EmbeddingError(
      'RunPod is not configured. Set RUNPOD_BASE_URL and RUNPOD_API_KEY in the backend environment.'
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey, model };
}

async function embedBatch(texts) {
  const { baseUrl, apiKey, model } = getConfig();

  let response;
  try {
    response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: texts }),
    });
  } catch (err) {
    throw new EmbeddingError(`Failed to reach RunPod embeddings endpoint: ${err.message}`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new EmbeddingError(`RunPod embeddings request failed (${response.status}): ${errText.slice(0, 500)}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.data)) {
    throw new EmbeddingError('RunPod embeddings response did not contain a "data" array.');
  }

  return data.data
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((entry) => entry.embedding);
}

/**
 * Generates embedding vectors for a list of text chunks, batching requests
 * to keep individual calls to the RunPod-hosted embedding model reasonably sized.
 */
async function getEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const results = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedBatch(batch);
    results.push(...embeddings);
  }
  return results;
}

module.exports = { getEmbeddings, EmbeddingError };
