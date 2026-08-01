const { getEmbeddings } = require('./embeddingService');
const { queryChunks } = require('./chromaService');

/**
 * Embeds queryText and retrieves the most relevant knowledge-base chunks from
 * Chroma, formatted with their source for citation. Returns [] on any failure
 * (RunPod/Chroma not configured, empty collection, etc.) so callers can treat
 * retrieval as a best-effort enhancement rather than a hard dependency.
 */
async function retrieveContext(queryText, topK = 4) {
  if (!queryText || !queryText.trim()) return [];

  try {
    const [embedding] = await getEmbeddings([queryText]);
    if (!embedding) return [];

    const result = await queryChunks({ embedding, nResults: topK });

    const documents = (result.documents && result.documents[0]) || [];
    const metadatas = (result.metadatas && result.metadatas[0]) || [];

    return documents
      .map((doc, idx) => {
        const meta = metadatas[idx] || {};
        const label = [meta.sourceName, meta.fileName].filter(Boolean).join(' / ') || 'Knowledge base';
        return { label, text: doc };
      })
      .filter((chunk) => chunk.text);
  } catch (err) {
    console.error('Knowledge retrieval skipped (non-fatal):', err.message);
    return [];
  }
}

module.exports = { retrieveContext };
