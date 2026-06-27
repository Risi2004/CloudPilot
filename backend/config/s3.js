const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CopyObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || ''
  }
});

/**
 * Uploads a base64 encoded image to Cloudflare R2
 * @param {string} base64String - DataURL base64 image string
 * @param {string} email - User's email to associate with the filename
 * @returns {Promise<string|null>} - The object key in R2 or null
 */
const uploadBase64Image = async (base64String, email) => {
  if (!base64String) return null;

  // Extract base64 details
  const mimeTypeMatch = base64String.match(/^data:(image\/\w+);base64,/);
  if (!mimeTypeMatch) {
    throw new Error('Invalid image format. Expected data:image/*;base64');
  }

  const mimeType = mimeTypeMatch[1];
  const extension = mimeType.split('/')[1];
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Create a unique key
  const timestamp = Date.now();
  const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
  const key = `avatars/${cleanEmail}_${timestamp}.${extension}`;

  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured.');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentLength: buffer.length,
    ContentType: mimeType
  });

  await s3Client.send(command);
  return key;
};

/**
 * Retrieves the object stream from Cloudflare R2
 * @param {string} key - The object key
 * @returns {Promise<{stream: any, contentType: string}>}
 */
const getPrivateImageStream = async (key) => {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured.');
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  const response = await s3Client.send(command);
  return {
    stream: response.Body,
    contentType: response.ContentType
  };
};

/**
 * Deletes an object from Cloudflare R2
 * @param {string} key - The object key
 */
const deleteImage = async (key) => {
  if (!key) return;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucketName) return;

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key
  });
  await s3Client.send(command);
};

/**
 * Creates an empty folder directory object in Cloudflare R2
 * @param {string} folderName - Name of the data source
 * @returns {Promise<string>} - The folder key path
 */
const createFolder = async (folderKey) => {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured.');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: folderKey,
    Body: Buffer.alloc(0),
    ContentLength: 0,
    ContentType: 'application/x-directory'
  });

  await s3Client.send(command);
  return folderKey;
};


/**
 * Uploads a base64 encoded document to a folder path in Cloudflare R2
 * @param {string} base64String - DataURL base64 document or raw base64 string
 * @param {string} folderKey - Destination folder key path
 * @param {string} fileName - Document filename
 * @param {string} mimeType - Document mime type
 * @returns {Promise<string>} - The uploaded object key path
 */
const uploadKnowledgeFile = async (base64String, folderKey, fileName, mimeType) => {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured.');
  }

  let buffer;
  let finalMimeType = mimeType || 'application/octet-stream';

  if (base64String.startsWith('data:')) {
    const mimeTypeMatch = base64String.match(/^data:([^;]+);base64,/);
    if (mimeTypeMatch) {
      finalMimeType = mimeTypeMatch[1];
    }
    const base64Data = base64String.replace(/^data:[^;]+;base64,/, "");
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    buffer = Buffer.from(base64String, 'base64');
  }

  let cleanFolderKey = folderKey;
  if (!cleanFolderKey.endsWith('/')) {
    cleanFolderKey += '/';
  }

  const key = `${cleanFolderKey}${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentLength: buffer.length,
    ContentType: finalMimeType
  });

  await s3Client.send(command);
  return key;
};

/**
 * Lists all folders (common prefixes) inside the knowledge-base/ folder in Cloudflare R2
 * @returns {Promise<string[]>} - List of folder names
 */
const listR2Folders = async () => {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured.');
  }

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: 'knowledge-base/',
    Delimiter: '/'
  });

  const response = await s3Client.send(command);
  const folders = [];

  if (response.CommonPrefixes) {
    for (const cp of response.CommonPrefixes) {
      const parts = cp.Prefix.split('/');
      const folderName = parts[parts.length - 2];
      if (folderName) {
        folders.push(folderName);
      }
    }
  }

  return folders;
};

/**
 * Deletes all objects under a folder key prefix in Cloudflare R2
 * @param {string} folderKey - Folder key path (ends with slash)
 */
const deleteR2Folder = async (folderKey) => {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured.');
  }

  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: folderKey
  });

  const listResponse = await s3Client.send(listCommand);

  if (listResponse.Contents && listResponse.Contents.length > 0) {
    for (const obj of listResponse.Contents) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: obj.Key
      });
      await s3Client.send(deleteCommand);
    }
  }
};

/**
 * Renames (moves) all objects from old folder key prefix to a new folder key prefix in Cloudflare R2
 * @param {string} oldFolderKey - Old folder key path (ends with slash)
 * @param {string} newFolderKey - New folder key path (ends with slash)
 */
const renameR2Folder = async (oldFolderKey, newFolderKey) => {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured.');
  }

  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: oldFolderKey
  });

  const listResponse = await s3Client.send(listCommand);

  if (listResponse.Contents && listResponse.Contents.length > 0) {
    for (const obj of listResponse.Contents) {
      const oldKey = obj.Key;
      const relativePath = oldKey.substring(oldFolderKey.length);
      const newKey = `${newFolderKey}${relativePath}`;

      // Copy object
      const copyCommand = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${oldKey}`,
        Key: newKey
      });
      await s3Client.send(copyCommand);

      // Delete old object
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: oldKey
      });
      await s3Client.send(deleteCommand);
    }
  }

  // Ensure new folder marker exists
  const folderMarkerCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: newFolderKey,
    Body: Buffer.alloc(0),
    ContentLength: 0,
    ContentType: 'application/x-directory'
  });
  await s3Client.send(folderMarkerCommand);
};

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

/**
 * Download an object from R2 as UTF-8 text.
 * @param {string} key
 * @returns {Promise<string>}
 */
const getObjectText = async (key) => {
  const { stream } = await getPrivateImageStream(key);
  const buffer = await streamToBuffer(stream);
  return buffer.toString('utf-8');
};

/**
 * List all object keys under a prefix (non-recursive delimiter disabled).
 * @param {string} prefix
 * @returns {Promise<Array<{ key: string, size: number }>>}
 */
const listKnowledgeObjects = async (prefix = 'knowledge-base/') => {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured.');
  }

  const objects = [];
  let continuationToken;
  let isTruncated = true;

  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await s3Client.send(command);
    for (const item of response.Contents || []) {
      if (!item.Key || item.Key.endsWith('/')) continue;
      objects.push({ key: item.Key, size: item.Size || 0 });
    }
    isTruncated = Boolean(response.IsTruncated);
    continuationToken = response.NextContinuationToken;
  }

  return objects;
};

module.exports = {
  s3Client,
  uploadBase64Image,
  getPrivateImageStream,
  getObjectText,
  listKnowledgeObjects,
  deleteImage,
  createFolder,
  uploadKnowledgeFile,
  listR2Folders,
  deleteR2Folder,
  renameR2Folder
};

