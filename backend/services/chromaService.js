const { ChromaClient } = require('chromadb');

let clientSingleton = null;
let collectionSingleton = null;

function getClient() {
  if (clientSingleton) return clientSingleton;

  const url = new URL(process.env.CHROMA_URL || 'http://localhost:8000');
  clientSingleton = new ChromaClient({
    host: url.hostname,
    port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
    ssl: url.protocol === 'https:',
  });
  return clientSingleton;
}

// We always supply precomputed embeddings from embeddingService, so the collection
// is created with no embedding function attached (Chroma never needs to embed for us).
async function getCollection() {
  if (collectionSingleton) return collectionSingleton;

  const client = getClient();
  const name = process.env.CHROMA_COLLECTION || 'cloudpilot-knowledge-base';
  collectionSingleton = await client.getOrCreateCollection({ name, embeddingFunction: null });
  return collectionSingleton;
}

async function heartbeat() {
  return getClient().heartbeat();
}

async function upsertChunks({ ids, embeddings, documents, metadatas }) {
  const collection = await getCollection();
  await collection.upsert({ ids, embeddings, documents, metadatas });
}

async function deleteChunksByFileId(fileId) {
  const collection = await getCollection();
  await collection.delete({ where: { fileId: String(fileId) } });
}

async function queryChunks({ embedding, nResults = 4, where }) {
  const collection = await getCollection();
  return collection.query({
    queryEmbeddings: [embedding],
    nResults,
    where,
    include: ['documents', 'metadatas', 'distances'],
  });
}

module.exports = { heartbeat, upsertChunks, deleteChunksByFileId, queryChunks };
