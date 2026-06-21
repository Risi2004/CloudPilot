const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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

module.exports = {
  s3Client,
  uploadBase64Image,
  getPrivateImageStream,
  deleteImage
};
