const crypto = require('crypto');
const DataSource = require('../models/DataSource');
const KnowledgeFile = require('../models/KnowledgeFile');
const { extractText, chunkText } = require('./textExtractionService');
const { getEmbeddings } = require('./embeddingService');
const { upsertChunks } = require('./chromaService');

const CONCURRENCY = 3;

const jobs = new Map();

async function resolveFilesToVectorize(dataSourceIds) {
  // Fetch all data sources at once to run parent-child traversal in memory,
  // avoiding N+1 database queries for large folder selections.
  const allSources = await DataSource.find({});
  
  const childrenMap = new Map();
  for (const source of allSources) {
    if (source.parentId) {
      const pId = String(source.parentId);
      if (!childrenMap.has(pId)) {
        childrenMap.set(pId, []);
      }
      childrenMap.get(pId).push(source);
    }
  }

  const getDescendantsInMemory = (parentId) => {
    let ids = [];
    const children = childrenMap.get(String(parentId)) || [];
    for (const child of children) {
      ids.push(String(child._id));
      ids.push(...getDescendantsInMemory(child._id));
    }
    return ids;
  };

  const allFolderIds = new Set();
  for (const id of dataSourceIds) {
    allFolderIds.add(String(id));
    const descendants = getDescendantsInMemory(id);
    descendants.forEach((d) => allFolderIds.add(d));
  }

  return KnowledgeFile.find({
    dataSourceId: { $in: Array.from(allFolderIds) },
    // $ne: true (not a literal `false` match) so documents that predate the
    // `vectorized` field entirely - missing it rather than storing false - still
    // count as not-yet-vectorized, consistent with how Mongoose hydrates the default.
    vectorized: { $ne: true },
  });
}

async function vectorizeFile(file) {
  const text = await extractText(file);
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    return { chunkIds: [] };
  }

  const embeddings = await getEmbeddings(chunks);
  const chunkIds = chunks.map((_, idx) => `${file._id}-${idx}`);
  const metadatas = chunks.map((_, idx) => ({
    fileId: String(file._id),
    dataSourceId: String(file.dataSourceId),
    fileName: file.name,
    sourceName: file.sourceName,
    chunkIndex: idx,
  }));

  await upsertChunks({ ids: chunkIds, embeddings, documents: chunks, metadatas });
  return { chunkIds };
}

async function runJob(jobId, files) {
  const job = jobs.get(jobId);

  const worker = async () => {
    while (job.cursor < files.length) {
      const index = job.cursor++;
      const file = files[index];
      job.currentFile = file.name;

      try {
        file.status = 'Indexing';
        await file.save();

        const { chunkIds } = await vectorizeFile(file);

        file.vectorized = true;
        file.vectorizedAt = new Date();
        file.vectorChunkIds = chunkIds;
        file.status = 'Ready';
        await file.save();

        job.completed++;
      } catch (err) {
        console.error(`Vectorization failed for file ${file.name} (${file._id}):`, err.message);
        try {
          file.status = 'Failed';
          await file.save();
        } catch (saveErr) {
          console.error('Failed to persist Failed status:', saveErr.message);
        }
        job.failed++;
        job.errors.push({ fileId: String(file._id), name: file.name, message: err.message });
      }
    }
  };

  const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker());
  await Promise.all(workers);

  job.status = 'completed';
  job.currentFile = null;
  job.finishedAt = new Date();
}

async function startVectorizationJob(dataSourceIds) {
  const files = await resolveFilesToVectorize(dataSourceIds);

  const jobId = crypto.randomUUID();
  const job = {
    id: jobId,
    status: 'running',
    total: files.length,
    completed: 0,
    failed: 0,
    cursor: 0,
    currentFile: null,
    errors: [],
    startedAt: new Date(),
    finishedAt: null,
  };
  jobs.set(jobId, job);

  if (files.length === 0) {
    job.status = 'completed';
    job.finishedAt = new Date();
    return jobId;
  }

  runJob(jobId, files).catch((err) => {
    console.error('Vectorization job crashed:', err);
    job.status = 'failed';
    job.finishedAt = new Date();
  });

  return jobId;
}

function getJobStatus(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  const { cursor, ...publicState } = job;
  return publicState;
}

module.exports = { startVectorizationJob, getJobStatus };
