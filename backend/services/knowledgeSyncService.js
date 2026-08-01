const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { s3Client } = require('../config/s3');
const DataSource = require('../models/DataSource');
const KnowledgeFile = require('../models/KnowledgeFile');

const ROOT_PREFIX = 'knowledge-base/';

const generateKey = (name) => name.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileTypeFromExtension = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['md', 'markdown', 'txt', 'docx', 'doc', 'csv'].includes(ext)) return 'doc';
  if (['json', 'yaml', 'yml', 'tf', 'js', 'jsx', 'ts', 'tsx', 'py', 'go', 'html', 'css', 'sh', 'hcl', 'conf', 'config'].includes(ext)) return 'code';
  return 'doc';
};

async function listAllObjects() {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured.');
  }

  const objects = [];
  let continuationToken;
  do {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: ROOT_PREFIX,
      ContinuationToken: continuationToken,
    }));
    if (response.Contents) objects.push(...response.Contents);
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

function dirname(key) {
  const idx = key.lastIndexOf('/', key.length - 2);
  return idx === -1 ? '' : key.slice(0, idx + 1);
}

function basename(key) {
  const trimmed = key.endsWith('/') ? key.slice(0, -1) : key;
  const idx = trimmed.lastIndexOf('/');
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

/**
 * Files get uploaded to Cloudflare R2 directly (outside the app's upload flow), so the
 * app's existing per-folder lazy sync never discovers them until an admin happens to
 * browse every folder. This walks the *entire* knowledge-base/ tree in R2 in one paginated
 * listing, derives the full folder hierarchy (including folders with no explicit directory
 * marker object - just files sitting under an implied path), and reconciles DataSource /
 * KnowledgeFile documents in MongoDB to match: creating anything missing, leaving existing
 * documents (and their vectorization state) untouched, and pruning anything no longer in R2.
 */
async function syncFullTreeFromR2() {
  const objects = await listAllObjects();

  const folderPaths = new Set();
  const fileObjects = [];

  for (const obj of objects) {
    if (obj.Key === ROOT_PREFIX) continue;

    if (obj.Key.endsWith('/')) {
      folderPaths.add(obj.Key);
    } else {
      fileObjects.push(obj);
    }

    // Register every ancestor folder path, whether or not it has an explicit marker object.
    let dir = dirname(obj.Key);
    while (dir && dir !== ROOT_PREFIX) {
      folderPaths.add(dir);
      dir = dirname(dir);
    }
  }

  // Create parents before children.
  const sortedFolderPaths = Array.from(folderPaths).sort(
    (a, b) => a.split('/').length - b.split('/').length
  );

  // One query for every already-known folder, instead of a round-trip per folder.
  const existingSources = await DataSource.find({ folderKey: { $in: sortedFolderPaths } });
  const folderKeyToId = new Map([[ROOT_PREFIX, null]]);
  for (const src of existingSources) {
    folderKeyToId.set(src.folderKey, src._id);
  }

  for (const folderKey of sortedFolderPaths) {
    if (folderKeyToId.has(folderKey)) continue;

    const name = basename(folderKey);
    const parentFolderKey = dirname(folderKey) || ROOT_PREFIX;
    const parentId = folderKeyToId.has(parentFolderKey) ? folderKeyToId.get(parentFolderKey) : null;

    let dataSource;
    try {
      dataSource = await DataSource.create({
        name,
        key: generateKey(name),
        folderKey,
        parentId,
        sub: 'R2 Folder',
        status: 'Synced',
      });
    } catch (err) {
      // Concurrent sync or key collision under the same parent - fetch whichever won.
      dataSource = await DataSource.findOne({ folderKey });
    }

    if (dataSource) folderKeyToId.set(folderKey, dataSource._id);
  }

  // One query for every already-known file, instead of a round-trip per file.
  const seenFileKeys = fileObjects
    .filter((obj) => folderKeyToId.get(dirname(obj.Key)))
    .map((obj) => obj.Key);
  const existingFiles = await KnowledgeFile.find({ fileKey: { $in: seenFileKeys } }).select('fileKey');
  const existingFileKeys = new Set(existingFiles.map((f) => f.fileKey));

  const folderNameById = new Map(Array.from(folderKeyToId.entries()).map(([key, id]) => [String(id), basename(key)]));

  const newFileDocs = [];
  for (const obj of fileObjects) {
    const parentFolderKey = dirname(obj.Key);
    const dataSourceId = folderKeyToId.get(parentFolderKey);
    if (!dataSourceId) continue; // orphan file directly under the root, no folder to attach to
    if (existingFileKeys.has(obj.Key)) continue;

    const filename = basename(obj.Key);
    newFileDocs.push({
      name: filename,
      dataSourceId,
      sourceName: folderNameById.get(String(dataSourceId)) || '',
      fileKey: obj.Key,
      size: formatSize(obj.Size),
      fileType: getFileTypeFromExtension(filename),
      status: 'Ready',
    });
  }

  if (newFileDocs.length > 0) {
    try {
      await KnowledgeFile.insertMany(newFileDocs, { ordered: false });
    } catch (err) {
      // Duplicate-key races are harmless (another sync already inserted the same file) - ignore those.
      if (err.code !== 11000 && !(err.writeErrors && err.writeErrors.every((we) => we.code === 11000))) {
        throw err;
      }
    }
  }

  // Prune Mongo records no longer present in R2.
  await KnowledgeFile.deleteMany({
    fileKey: { $regex: `^${ROOT_PREFIX}`, $nin: seenFileKeys },
  });

  const liveFolderKeys = Array.from(folderKeyToId.keys()).filter((k) => k !== ROOT_PREFIX);
  await DataSource.deleteMany({
    folderKey: { $regex: `^${ROOT_PREFIX}`, $nin: liveFolderKeys },
  });
}

module.exports = { syncFullTreeFromR2 };
