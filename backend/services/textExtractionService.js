const { getPrivateImageStream } = require('../config/s3');

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
const MAX_CHUNKS_PER_FILE = 200;

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Fetches a KnowledgeFile's object from Cloudflare R2 and returns its plain-text content.
 */
async function extractText(file) {
  const { stream } = await getPrivateImageStream(file.fileKey);
  const buffer = await streamToBuffer(stream);

  if (file.fileType === 'pdf') {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text || '';
    } finally {
      if (typeof parser.destroy === 'function') await parser.destroy();
    }
  }

  return buffer.toString('utf-8');
}

/**
 * Splits text into overlapping fixed-size chunks, capped so a single runaway
 * file can't blow up the embedding batch.
 */
function chunkText(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return [];

  const chunks = [];
  let start = 0;
  while (start < trimmed.length && chunks.length < MAX_CHUNKS_PER_FILE) {
    const end = Math.min(start + CHUNK_SIZE, trimmed.length);
    const chunk = trimmed.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= trimmed.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

module.exports = { extractText, chunkText };
