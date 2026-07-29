const { getEmbeddings } = require('./embeddingService');
const { queryChunks } = require('./chromaService');

// Error-pattern chunks live in the same Chroma collection as the rest of
// CloudPilot's knowledge base, tagged with this metadata so retrieval never
// mixes them with the Render/Vercel documentation chunks used elsewhere.
const ERROR_PATTERN_WHERE = { category: 'error_pattern' };

/**
 * Embeds queryText and retrieves the most relevant known error/fix chunks
 * from Chroma. Mirrors knowledgeRetrievalService.retrieveContext but scoped
 * to error-pattern chunks via a metadata filter. Fails soft (returns []) so
 * the Troubleshooting Agent can treat this as a best-effort enhancement to
 * the LLM diagnosis, not a hard dependency.
 */
async function retrieveErrorContext(queryText, topK = 4) {
  if (!queryText || !queryText.trim()) return [];

  try {
    const [embedding] = await getEmbeddings([queryText]);
    if (!embedding) return [];

    const result = await queryChunks({ embedding, nResults: topK, where: ERROR_PATTERN_WHERE });

    const documents = (result.documents && result.documents[0]) || [];
    const metadatas = (result.metadatas && result.metadatas[0]) || [];

    return documents
      .map((doc, idx) => {
        const meta = metadatas[idx] || {};
        const label = meta.errorType || meta.sourceName || 'Known error pattern';
        return { label, text: doc };
      })
      .filter((chunk) => chunk.text);
  } catch (err) {
    console.error('Error-knowledge retrieval skipped (non-fatal):', err.message);
    return [];
  }
}

module.exports = { retrieveErrorContext, ERROR_PATTERN_WHERE };
