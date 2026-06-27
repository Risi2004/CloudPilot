const crypto = require('crypto');
const KnowledgeFile = require('../models/KnowledgeFile');
const KnowledgeSyncReport = require('../models/KnowledgeSyncReport');
const DataSource = require('../models/DataSource');
const { getObjectText, listKnowledgeObjects } = require('../config/s3');
const { runKnowledgeSync } = require('./agentRuntimeClient');
const {
  startSyncJob,
  updateProgress,
  completeSyncJob,
  failSyncJob,
  getSyncProgress,
  getActiveSyncJob,
} = require('./syncProgressStore');

const KNOWLEDGE_PREFIX = 'knowledge-base/';
const SYNC_BATCH_SIZE = Number(process.env.KNOWLEDGE_SYNC_BATCH_SIZE || 25);

function sanitizeTextForEmbedding(text) {
  if (!text) return text;
  // Remove lone UTF-16 surrogates that break Python UTF-8 encoding.
  return text.replace(/[\uD800-\uDFFF]/g, '\uFFFD');
}

function sha256(text) {
  const cleaned = sanitizeTextForEmbedding(text);
  return crypto.createHash('sha256').update(cleaned, 'utf8').digest('hex');
}

function documentIdFromFileKey(fileKey) {
  return sha256(fileKey);
}

function derivePlatformCategory(relativePath) {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (!parts.length) {
    return { platform: 'unknown', category: 'general' };
  }

  const platform = parts[0].toLowerCase();
  let category = 'general';
  if (parts.length >= 3) {
    category = parts[1].toLowerCase().replace(/\s+/g, '-');
  } else if (parts.length === 2) {
    const stem = parts[1].replace(/\.[^.]+$/, '');
    category = stem.toLowerCase().replace(/\s+/g, '-');
    if (category === platform) category = 'general';
  }
  return { platform, category };
}

function relativePathFromKey(fileKey) {
  return fileKey.startsWith(KNOWLEDGE_PREFIX)
    ? fileKey.slice(KNOWLEDGE_PREFIX.length)
    : fileKey;
}

function isMarkdownKey(key) {
  return /\.md$/i.test(key);
}

function isUnderFolderPrefix(fileKey, folderPrefix) {
  return fileKey.startsWith(folderPrefix);
}

async function resolveSyncScope(options = {}) {
  const { dataSourceId, folderPrefix, scopeLabel } = options;

  if (folderPrefix) {
    const normalized = folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`;
    if (!normalized.startsWith(KNOWLEDGE_PREFIX)) {
      throw new Error('Invalid sync folder prefix.');
    }
    return {
      folderPrefix: normalized,
      scopeLabel: scopeLabel || normalized.slice(KNOWLEDGE_PREFIX.length).replace(/\/$/, '') || 'All folders',
      dataSourceId: dataSourceId || null,
    };
  }

  if (dataSourceId) {
    const dataSource = await DataSource.findById(dataSourceId);
    if (!dataSource) {
      throw new Error('Selected folder not found.');
    }
    return {
      folderPrefix: dataSource.folderKey,
      scopeLabel: scopeLabel || dataSource.name,
      dataSourceId: dataSource._id.toString(),
    };
  }

  return {
    folderPrefix: KNOWLEDGE_PREFIX,
    scopeLabel: scopeLabel || 'All folders',
    dataSourceId: null,
  };
}

async function findDataSourceForKey(fileKey, dataSourceByFolderKey, allDataSources) {
  let folderKey = `${fileKey.slice(0, fileKey.lastIndexOf('/') + 1)}`;
  while (folderKey.startsWith(KNOWLEDGE_PREFIX)) {
    const match = dataSourceByFolderKey.get(folderKey);
    if (match) return match;
    const trimmed = folderKey.slice(0, -1);
    const slashIndex = trimmed.lastIndexOf('/');
    if (slashIndex < KNOWLEDGE_PREFIX.length - 1) break;
    folderKey = `${trimmed.slice(0, slashIndex + 1)}`;
  }
  return allDataSources.find((ds) => fileKey.startsWith(ds.folderKey)) || null;
}

async function ensureKnowledgeFileRecord(objectMeta, dataSourceByFolderKey, allDataSources) {
  const relativePath = relativePathFromKey(objectMeta.key);
  const dataSource = await findDataSourceForKey(objectMeta.key, dataSourceByFolderKey, allDataSources);

  let file = await KnowledgeFile.findOne({ fileKey: objectMeta.key });
  const { platform, category } = derivePlatformCategory(relativePath);

  if (!file) {
    if (!dataSource) {
      throw new Error(`No data source found for ${objectMeta.key}`);
    }
    file = new KnowledgeFile({
      name: relativePath.split('/').pop(),
      dataSourceId: dataSource?._id,
      sourceName: dataSource?.name || platform,
      fileKey: objectMeta.key,
      size: `${objectMeta.size} B`,
      fileType: 'doc',
      embeddingStatus: 'Pending',
      platform,
      category,
      relativePath,
      documentId: documentIdFromFileKey(objectMeta.key),
    });
    await file.save();
  } else {
    file.platform = platform;
    file.category = category;
    file.relativePath = relativePath;
    file.documentId = documentIdFromFileKey(objectMeta.key);
    if (dataSource && !file.dataSourceId) {
      file.dataSourceId = dataSource._id;
      file.sourceName = dataSource.name;
    }
  }

  return file;
}

function emitProgress(onProgress, partial) {
  if (typeof onProgress === 'function') {
    onProgress(partial);
  }
}

async function runKnowledgeSynchronization(userId, onProgress, scope = {}) {
  const syncScope = await resolveSyncScope(scope);
  const started = Date.now();

  emitProgress(onProgress, {
    phase: 'listing',
    phaseLabel: `Listing markdown files in ${syncScope.scopeLabel}...`,
    scopeLabel: syncScope.scopeLabel,
    folderPrefix: syncScope.folderPrefix,
    progressPercent: 2,
  });

  const objects = (await listKnowledgeObjects(syncScope.folderPrefix)).filter((item) =>
    isMarkdownKey(item.key),
  );
  const totalFiles = objects.length;

  emitProgress(onProgress, {
    phase: 'preparing',
    phaseLabel: `Checking file hashes (0/${totalFiles}) in ${syncScope.scopeLabel}...`,
    scopeLabel: syncScope.scopeLabel,
    folderPrefix: syncScope.folderPrefix,
    totalFiles,
    progressPercent: 5,
  });

  const dataSources = await DataSource.find({});
  const dataSourceByFolderKey = new Map(dataSources.map((ds) => [ds.folderKey, ds]));

  const activeKeys = new Set(objects.map((item) => item.key));
  const existingMarkdownFiles = await KnowledgeFile.find({
    fileKey: { $regex: /\.md$/i },
  });
  const scopedExistingFiles = existingMarkdownFiles.filter((file) =>
    isUnderFolderPrefix(file.fileKey, syncScope.folderPrefix),
  );

  const deletedDocumentIds = scopedExistingFiles
    .filter((file) => !activeKeys.has(file.fileKey))
    .map((file) => file.documentId || documentIdFromFileKey(file.fileKey));

  if (deletedDocumentIds.length) {
    const deletedFileKeys = scopedExistingFiles
      .filter((file) => !activeKeys.has(file.fileKey))
      .map((file) => file.fileKey);
    await KnowledgeFile.deleteMany({ fileKey: { $in: deletedFileKeys } });
  }

  const manifestFiles = [];
  let unchangedCount = 0;
  const prepErrors = [];

  for (let fileIndex = 0; fileIndex < objects.length; fileIndex += 1) {
    const objectMeta = objects[fileIndex];
    try {
      const file = await ensureKnowledgeFileRecord(objectMeta, dataSourceByFolderKey, dataSources);
      const content = sanitizeTextForEmbedding(await getObjectText(objectMeta.key));
      const contentHash = sha256(content);

      if (file.contentHash === contentHash && file.embeddingStatus === 'Indexed') {
        unchangedCount += 1;
        if (fileIndex % 5 === 0 || fileIndex === objects.length - 1) {
          const prepProgress = totalFiles
            ? 5 + Math.round(((fileIndex + 1) / totalFiles) * 10)
            : 15;
          emitProgress(onProgress, {
            preparedFiles: fileIndex + 1,
            unchangedFiles: unchangedCount,
            filesToIndex: manifestFiles.length,
            progressPercent: prepProgress,
            phaseLabel: `Checking file hashes (${fileIndex + 1}/${totalFiles})...`,
          });
        }
        continue;
      }

      const relativePath = file.relativePath || relativePathFromKey(objectMeta.key);
      manifestFiles.push({
        file_key: objectMeta.key,
        relative_path: relativePath,
        platform: file.platform,
        category: file.category,
        content_hash: contentHash,
        content,
        is_new: !file.contentHash,
        is_updated: Boolean(file.contentHash && file.contentHash !== contentHash),
      });

      file.status = 'Indexing';
      file.embeddingStatus = 'Pending';
      file.syncError = null;
      await file.save();

      if (fileIndex % 5 === 0 || fileIndex === objects.length - 1) {
        const prepProgress = totalFiles
          ? 5 + Math.round(((fileIndex + 1) / totalFiles) * 10)
          : 15;
        emitProgress(onProgress, {
          preparedFiles: fileIndex + 1,
          unchangedFiles: unchangedCount,
          filesToIndex: manifestFiles.length,
          progressPercent: prepProgress,
          phaseLabel: `Checking file hashes (${fileIndex + 1}/${totalFiles})...`,
        });
      }
    } catch (err) {
      prepErrors.push({
        fileKey: objectMeta.key,
        message: err.message || 'Failed to prepare file for synchronization.',
      });
    }
  }

  const totalBatches = Math.max(1, Math.ceil(manifestFiles.length / SYNC_BATCH_SIZE));

  emitProgress(onProgress, {
    phase: manifestFiles.length ? 'embedding' : 'finalizing',
    phaseLabel: manifestFiles.length
      ? `Embedding vectors (0/${manifestFiles.length} files) in ${syncScope.scopeLabel}...`
      : `No changed files in ${syncScope.scopeLabel} — saving report...`,
    scopeLabel: syncScope.scopeLabel,
    folderPrefix: syncScope.folderPrefix,
    filesToIndex: manifestFiles.length,
    unchangedFiles: unchangedCount,
    totalBatches,
    currentBatch: 0,
    progressPercent: manifestFiles.length ? 15 : 90,
  });

  const aggregateReport = {
    scope_label: syncScope.scopeLabel,
    folder_prefix: syncScope.folderPrefix,
    new_documents: 0,
    updated_documents: 0,
    deleted_documents: deletedDocumentIds.length,
    unchanged_documents: unchangedCount,
    total_chunks_created: 0,
    total_embeddings_generated: 0,
    total_vectors: 0,
    processing_time_ms: 0,
    errors: prepErrors,
    file_results: [],
  };

  for (let index = 0; index < manifestFiles.length; index += SYNC_BATCH_SIZE) {
    const batch = manifestFiles.slice(index, index + SYNC_BATCH_SIZE);
    const batchNumber = Math.floor(index / SYNC_BATCH_SIZE) + 1;
    const indexedSoFar = index;

    emitProgress(onProgress, {
      phase: 'embedding',
      phaseLabel: `Embedding batch ${batchNumber}/${totalBatches} (${indexedSoFar}/${manifestFiles.length} files) in ${syncScope.scopeLabel}...`,
      scopeLabel: syncScope.scopeLabel,
      folderPrefix: syncScope.folderPrefix,
      currentBatch: batchNumber,
      totalBatches,
      indexedFiles: indexedSoFar,
      filesToIndex: manifestFiles.length,
      progressPercent: 15 + Math.round((indexedSoFar / Math.max(manifestFiles.length, 1)) * 80),
    });

    const batchReport = await runKnowledgeSync({
      files: batch,
      deleted_document_ids: index === 0 ? deletedDocumentIds : [],
      unchanged_count: index === 0 ? unchangedCount : 0,
    });

    aggregateReport.new_documents += batchReport.new_documents || 0;
    aggregateReport.updated_documents += batchReport.updated_documents || 0;
    aggregateReport.total_chunks_created += batchReport.total_chunks_created || 0;
    aggregateReport.total_embeddings_generated += batchReport.total_embeddings_generated || 0;
    aggregateReport.total_vectors = batchReport.total_vectors || aggregateReport.total_vectors;
    aggregateReport.processing_time_ms += batchReport.processing_time_ms || 0;
    aggregateReport.errors.push(...(batchReport.errors || []));
    aggregateReport.file_results.push(...(batchReport.file_results || []));

    for (const result of batchReport.file_results || []) {
      const file = await KnowledgeFile.findOne({ fileKey: result.file_key });
      if (!file) continue;

      if (result.error) {
        file.status = 'Failed';
        file.embeddingStatus = 'Failed';
        file.syncError = result.error;
      } else {
        const source = batch.find((item) => item.file_key === result.file_key);
        file.contentHash = source?.content_hash || file.contentHash;
        file.documentId = result.document_id;
        file.chunkCount = result.chunk_count;
        file.vectorIds = result.vector_ids || [];
        file.embeddingStatus = 'Indexed';
        file.status = 'Ready';
        file.lastSyncedAt = new Date();
        file.syncError = null;
      }
      await file.save();
    }

    const indexedFiles = Math.min(index + batch.length, manifestFiles.length);
    emitProgress(onProgress, {
      phase: 'embedding',
      phaseLabel: `Embedded ${indexedFiles}/${manifestFiles.length} files...`,
      currentBatch: batchNumber,
      totalBatches,
      indexedFiles,
      filesToIndex: manifestFiles.length,
      totalVectors: aggregateReport.total_vectors,
      chunksCreated: aggregateReport.total_chunks_created,
      progressPercent: 15 + Math.round((indexedFiles / Math.max(manifestFiles.length, 1)) * 80),
    });
  }

  emitProgress(onProgress, {
    phase: 'finalizing',
    phaseLabel: 'Saving synchronization report...',
    progressPercent: 98,
    indexedFiles: manifestFiles.length,
    filesToIndex: manifestFiles.length,
    totalVectors: aggregateReport.total_vectors,
    chunksCreated: aggregateReport.total_chunks_created,
  });

  aggregateReport.processing_time_ms = Date.now() - started;

  const savedReport = await KnowledgeSyncReport.create({
    triggeredBy: userId,
    scopeLabel: syncScope.scopeLabel,
    folderPrefix: syncScope.folderPrefix,
    newDocuments: aggregateReport.new_documents,
    updatedDocuments: aggregateReport.updated_documents,
    deletedDocuments: aggregateReport.deleted_documents,
    unchangedDocuments: aggregateReport.unchanged_documents,
    totalChunksCreated: aggregateReport.total_chunks_created,
    totalEmbeddingsGenerated: aggregateReport.total_embeddings_generated,
    totalVectors: aggregateReport.total_vectors,
    processingTimeMs: aggregateReport.processing_time_ms,
    errors: aggregateReport.errors,
  });

  emitProgress(onProgress, {
    phase: 'completed',
    phaseLabel: `Synchronization complete (${syncScope.scopeLabel})`,
    scopeLabel: syncScope.scopeLabel,
    folderPrefix: syncScope.folderPrefix,
    progressPercent: 100,
    indexedFiles: manifestFiles.length,
    filesToIndex: manifestFiles.length,
    totalVectors: aggregateReport.total_vectors,
    chunksCreated: aggregateReport.total_chunks_created,
  });

  return {
    report: savedReport,
    summary: aggregateReport,
  };
}

function startKnowledgeSyncJob(userId, options = {}) {
  return resolveSyncScope(options).then((syncScope) => {
    const job = startSyncJob(userId, {
      scopeLabel: syncScope.scopeLabel,
      folderPrefix: syncScope.folderPrefix,
    });

    runKnowledgeSynchronization(userId, (partial) => updateProgress(partial), syncScope)
      .then((result) => {
        completeSyncJob(result);
      })
      .catch((err) => {
        failSyncJob(err.message || 'Knowledge synchronization failed.');
      });

    return job;
  });
}

async function getLatestSyncStats() {
  const latest = await KnowledgeSyncReport.findOne().sort({ createdAt: -1 });
  return {
    totalVectors: latest?.totalVectors || 0,
    lastSyncedAt: latest?.createdAt || null,
    latestReport: latest,
  };
}

module.exports = {
  runKnowledgeSynchronization,
  startKnowledgeSyncJob,
  getLatestSyncStats,
  getSyncProgress,
  getActiveSyncJob,
  resolveSyncScope,
  derivePlatformCategory,
  documentIdFromFileKey,
};
