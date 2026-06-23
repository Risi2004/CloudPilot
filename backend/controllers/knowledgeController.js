const DataSource = require('../models/DataSource');
const KnowledgeFile = require('../models/KnowledgeFile');
const { createFolder, uploadKnowledgeFile, listR2Folders } = require('../config/s3');

// Helper to sanitize key name
const generateKey = (name) => {
  return name.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
};

const getDataSources = async (req, res, next) => {
  try {
    const parentId = req.query.parentId && req.query.parentId !== 'null' ? req.query.parentId : null;

    let parentFolderKey = 'knowledge-base/';
    if (parentId) {
      const parent = await DataSource.findById(parentId);
      if (!parent) {
        return res.status(404).json({ message: 'Parent folder not found.' });
      }
      parentFolderKey = parent.folderKey;
    }

    let r2Folders = [];
    try {
      const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
      const { s3Client } = require('../config/s3');
      
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
      if (!bucketName) {
        throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured.');
      }

      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: parentFolderKey,
        Delimiter: '/'
      });

      const response = await s3Client.send(command);

      if (response.CommonPrefixes) {
        for (const cp of response.CommonPrefixes) {
          const parts = cp.Prefix.split('/');
          const folderName = parts[parts.length - 2];
          if (folderName && cp.Prefix !== parentFolderKey) {
            r2Folders.push(folderName);
          }
        }
      }
    } catch (s3Err) {
      console.error('Error listing folders from Cloudflare R2:', s3Err);
      // Fallback to MongoDB list in case of connection/credentials issue
      const mongoSources = await DataSource.find({ parentId }).sort({ createdAt: 1 });
      return res.status(200).json({ 
        sources: mongoSources, 
        warning: 'Could not connect to Cloudflare R2. Showing local database sources.' 
      });
    }

    // Match R2 folders with MongoDB
    const allDbSources = await DataSource.find({ parentId });
    const sourcesList = [];

    for (const folderName of r2Folders) {
      const key = folderName.toLowerCase();
      const dbMatch = allDbSources.find(
        s => s.key === key || s.name.toLowerCase() === key
      );

      if (dbMatch) {
        sourcesList.push(dbMatch);
      } else {
        const newDS = new DataSource({
          name: folderName,
          key,
          folderKey: `${parentFolderKey}${folderName}/`,
          parentId,
          sub: 'R2 Folder',
          status: 'Synced'
        });
        await newDS.save();
        sourcesList.push(newDS);
      }
    }

    sourcesList.sort((a, b) => a.name.localeCompare(b.name));
    res.status(200).json({ sources: sourcesList });
  } catch (err) {
    next(err);
  }
};

const addDataSource = async (req, res, next) => {
  try {
    const { name, sub, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Folder Name is required.' });
    }

    const key = generateKey(name);
    const resolvedParentId = parentId && parentId !== 'null' ? parentId : null;
    
    // Verify uniqueness under the same parent
    const existing = await DataSource.findOne({ key, parentId: resolvedParentId });
    if (existing) {
      return res.status(400).json({ message: 'A Folder with this name already exists in this directory.' });
    }

    // Determine path
    let folderKey = `knowledge-base/${name.trim().replace(/\s+/g, '-')}/`;
    if (resolvedParentId) {
      const parent = await DataSource.findById(resolvedParentId);
      if (!parent) {
        return res.status(404).json({ message: 'Parent folder not found.' });
      }
      folderKey = `${parent.folderKey}${name.trim().replace(/\s+/g, '-')}/`;
    }

    // 1. Create Folder in Cloudflare R2
    try {
      await createFolder(folderKey);
    } catch (s3Error) {
      console.error('Error creating folder in Cloudflare R2:', s3Error);
      return res.status(500).json({ message: 'Failed to create folder in Cloudflare R2: ' + s3Error.message });
    }

    // 2. Save in MongoDB
    const dataSource = new DataSource({
      name: name.trim(),
      key,
      folderKey,
      parentId: resolvedParentId,
      sub: sub || 'R2 Folder',
      status: 'Synced'
    });

    await dataSource.save();

    res.status(201).json({
      message: 'Folder added and Cloudflare R2 folder created.',
      dataSource
    });
  } catch (err) {
    next(err);
  }
};

const getFiles = async (req, res, next) => {
  try {
    const { dataSourceId } = req.query;
    let query = {};
    if (dataSourceId && dataSourceId !== 'null') {
      query.dataSourceId = dataSourceId;
    }
    const files = await KnowledgeFile.find(query).populate('dataSourceId').sort({ uploadedAt: -1 });
    res.status(200).json({ files });
  } catch (err) {
    next(err);
  }
};

const uploadFile = async (req, res, next) => {
  try {
    const { name, dataSourceId, fileData, size, fileType } = req.body;
    if (!name || !dataSourceId || !fileData || !size || !fileType) {
      return res.status(400).json({ message: 'Name, dataSourceId, fileData (base64), size, and fileType are required.' });
    }

    const dataSource = await DataSource.findById(dataSourceId);
    if (!dataSource) {
      return res.status(404).json({ message: 'Data Source not found.' });
    }

    // Determine MIME type based on fileType / extension
    let mimeType = 'application/octet-stream';
    if (fileType === 'pdf') mimeType = 'application/pdf';
    else if (fileType === 'code') mimeType = 'text/plain';
    else if (fileType === 'doc') mimeType = 'text/markdown';

    // 1. Upload File to Cloudflare R2
    let fileKey;
    try {
      fileKey = await uploadKnowledgeFile(fileData, dataSource.folderKey, name, mimeType);
    } catch (s3Error) {
      console.error('Error uploading file to Cloudflare R2:', s3Error);
      return res.status(500).json({ message: 'Failed to upload file to Cloudflare R2: ' + s3Error.message });
    }

    // 2. Save File in MongoDB
    const knowledgeFile = new KnowledgeFile({
      name: name.trim(),
      dataSourceId: dataSource._id,
      sourceName: dataSource.name,
      fileKey,
      size,
      fileType,
      status: 'Ready'
    });

    await knowledgeFile.save();

    res.status(201).json({
      message: 'Document successfully indexed and uploaded to Cloudflare R2.',
      file: knowledgeFile
    });
  } catch (err) {
    next(err);
  }
};

// Seed initial data if the database is empty
const seedKnowledgeBase = async () => {
  try {
    const count = await DataSource.countDocuments({});
    if (count > 0) return;

    console.log('Seeding initial knowledge base data sources...');

    const initialSources = [
      { name: 'AWS', sub: 'CloudFormation & Docs' },
      { name: 'Docker', sub: 'Container Specs' },
      { name: 'Terraform', sub: 'HCL Modules' },
      { name: 'CloudWatch', sub: 'Log Metrics' },
      { name: 'Vercel', sub: 'Deployment Logs' }
    ];

    const createdSources = [];
    for (const src of initialSources) {
      const key = generateKey(src.name);
      const folderKey = `knowledge-base/${key}/`;

      // Try creating folder in R2 (silently catch if fails, e.g. credentials missing in local test)
      try {
        await createFolder(src.name);
      } catch (e) {
        console.warn(`R2 seed warning for ${src.name}:`, e.message);
      }

      const dataSource = new DataSource({
        name: src.name,
        key,
        folderKey,
        sub: src.sub,
        status: 'Synced'
      });

      await dataSource.save();
      createdSources.push(dataSource);
    }

    console.log('Seeded initial data sources.');

    // Seed initial files
    const awsSource = createdSources.find(s => s.key === 'aws');
    const dockerSource = createdSources.find(s => s.key === 'docker');
    const terraformSource = createdSources.find(s => s.key === 'terraform');
    const vercelSource = createdSources.find(s => s.key === 'vercel');

    const initialFiles = [
      { name: 'aws-security-audit-2024.pdf', source: awsSource, size: '14.2 MB', fileType: 'pdf' },
      { name: 'docker-compose.prod.yaml', source: dockerSource, size: '256 KB', fileType: 'code' },
      { name: 'infra-schema.tf', source: terraformSource, size: '1.1 MB', fileType: 'code' },
      { name: 'enterprise-compliance-manual.md', source: awsSource, size: '88 KB', fileType: 'doc' },
      { name: 'render-deploy-v2.json', source: vercelSource, size: '42 KB', fileType: 'code' }
    ];

    for (const f of initialFiles) {
      if (!f.source) continue;
      
      const key = `${f.source.folderKey}${f.name}`;
      
      // Upload empty file placeholder to R2 for seed files
      try {
        await uploadKnowledgeFile(Buffer.from('Seed placeholder content').toString('base64'), f.source.folderKey, f.name, 'text/plain');
      } catch (e) {
        console.warn(`R2 file seed warning for ${f.name}:`, e.message);
      }

      const kFile = new KnowledgeFile({
        name: f.name,
        dataSourceId: f.source._id,
        sourceName: f.source.name,
        fileKey: key,
        size: f.size,
        fileType: f.fileType,
        status: 'Ready'
      });

      await kFile.save();
    }

    console.log('Seeded initial knowledge files.');
  } catch (err) {
    console.error('Error seeding knowledge base:', err);
  }
};

const editDataSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'New name is required.' });
    }

    const dataSource = await DataSource.findById(id);
    if (!dataSource) {
      return res.status(404).json({ message: 'Data Source not found.' });
    }

    const oldName = dataSource.name;
    const newName = name.trim();
    if (oldName === newName) {
      return res.status(200).json({ message: 'Name is unchanged.', dataSource });
    }

    const newKey = generateKey(newName);
    
    // Uniqueness validation under same parent
    const existing = await DataSource.findOne({ key: newKey, parentId: dataSource.parentId });
    if (existing && existing._id.toString() !== id) {
      return res.status(400).json({ message: 'A Folder with this name already exists in this directory.' });
    }

    const oldFolderKey = dataSource.folderKey;
    const cleanFolder = newName.replace(/[^a-zA-Z0-9_ -]/g, '').replace(/\s+/g, '-');
    
    let newFolderKey = `knowledge-base/${cleanFolder}/`;
    if (dataSource.parentId) {
      const parent = await DataSource.findById(dataSource.parentId);
      if (parent) {
        newFolderKey = `${parent.folderKey}${cleanFolder}/`;
      }
    }

    // 1. Rename Folder in Cloudflare R2
    try {
      const { renameR2Folder } = require('../config/s3');
      await renameR2Folder(oldFolderKey, newFolderKey);
    } catch (s3Error) {
      console.error('Error renaming folder in R2:', s3Error);
      return res.status(500).json({ message: 'Failed to rename folder in Cloudflare R2: ' + s3Error.message });
    }

    // 2. Update this folder and all subfolders recursively in MongoDB
    const allDescendantSources = await DataSource.find({ folderKey: new RegExp('^' + oldFolderKey) });
    for (const src of allDescendantSources) {
      const relativePath = src.folderKey.substring(oldFolderKey.length);
      src.folderKey = `${newFolderKey}${relativePath}`;
      if (src._id.toString() === id) {
        src.name = newName;
        src.key = newKey;
      }
      await src.save();
    }

    // 3. Update all files under this folder prefix in MongoDB
    const allDescendantFiles = await KnowledgeFile.find({ fileKey: new RegExp('^' + oldFolderKey) });
    for (const file of allDescendantFiles) {
      const relativePath = file.fileKey.substring(oldFolderKey.length);
      file.fileKey = `${newFolderKey}${relativePath}`;
      if (file.dataSourceId.toString() === id) {
        file.sourceName = newName;
      }
      await file.save();
    }

    res.status(200).json({
      message: 'Folder renamed successfully in R2 and MongoDB.',
      dataSource
    });
  } catch (err) {
    next(err);
  }
};

const getDescendantIds = async (parentId) => {
  let ids = [];
  const children = await DataSource.find({ parentId });
  for (const child of children) {
    ids.push(child._id);
    const subIds = await getDescendantIds(child._id);
    ids = ids.concat(subIds);
  }
  return ids;
};

const deleteDataSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dataSource = await DataSource.findById(id);
    if (!dataSource) {
      return res.status(404).json({ message: 'Data Source not found.' });
    }

    // 1. Delete all objects under this folder key in Cloudflare R2
    try {
      const { deleteR2Folder } = require('../config/s3');
      await deleteR2Folder(dataSource.folderKey);
    } catch (s3Error) {
      console.error('Error deleting folder in R2:', s3Error);
      return res.status(500).json({ message: 'Failed to delete folder in Cloudflare R2: ' + s3Error.message });
    }

    // 2. Delete all descendant subfolders and files from MongoDB
    const descendantIds = await getDescendantIds(dataSource._id);
    const allFolderIds = [dataSource._id, ...descendantIds];

    await KnowledgeFile.deleteMany({ dataSourceId: { $in: allFolderIds } });
    await DataSource.deleteMany({ _id: { $in: allFolderIds } });

    res.status(200).json({
      message: 'Data Source and all contained documents deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await KnowledgeFile.findById(id);
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    // 1. Delete from R2
    try {
      const { deleteImage } = require('../config/s3');
      await deleteImage(file.fileKey);
    } catch (s3Error) {
      console.error('Error deleting file from R2:', s3Error);
      return res.status(500).json({ message: 'Failed to delete file from Cloudflare R2: ' + s3Error.message });
    }

    // 2. Delete from MongoDB
    await KnowledgeFile.deleteOne({ _id: file._id });

    res.status(200).json({ message: 'Document deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

const editFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'New file name is required.' });
    }

    const file = await KnowledgeFile.findById(id).populate('dataSourceId');
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const oldName = file.name;
    const newName = name.trim();
    if (oldName === newName) {
      return res.status(200).json({ message: 'Name is unchanged.', file });
    }

    const oldKey = file.fileKey;
    const folderKey = file.dataSourceId.folderKey;
    const newKey = `${folderKey}${newName}`;

    // 1. Rename in R2 (Copy + Delete)
    try {
      const { s3Client } = require('../config/s3');
      const { CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

      await s3Client.send(new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${oldKey}`,
        Key: newKey
      }));

      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: oldKey
      }));
    } catch (s3Error) {
      console.error('Error renaming file in R2:', s3Error);
      return res.status(500).json({ message: 'Failed to rename file in Cloudflare R2: ' + s3Error.message });
    }

    // 2. Update in MongoDB
    file.name = newName;
    file.fileKey = newKey;
    await file.save();

    res.status(200).json({ message: 'File renamed successfully.', file });
  } catch (err) {
    next(err);
  }
};

const viewFileContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await KnowledgeFile.findById(id);
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const { getPrivateImageStream } = require('../config/s3');
    const { stream, contentType } = await getPrivateImageStream(file.fileKey);

    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

const getBucketSize = async (req, res, next) => {
  try {
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const { s3Client } = require('../config/s3');
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    const mdFileCount = await KnowledgeFile.countDocuments({ name: /\.md$/i });

    if (!bucketName) {
      return res.status(200).json({ storageSize: '0 B', mdFileCount });
    }

    let totalSize = 0;
    let isTruncated = true;
    let continuationToken = undefined;

    while (isTruncated) {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: 'knowledge-base/',
        ContinuationToken: continuationToken
      });

      const response = await s3Client.send(command);
      if (response.Contents) {
        for (const item of response.Contents) {
          totalSize += item.Size || 0;
        }
      }

      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;
    }

    // Format size
    let formattedSize = '0 B';
    if (totalSize > 0) {
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(totalSize) / Math.log(k));
      formattedSize = parseFloat((totalSize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    res.status(200).json({ storageSize: formattedSize, mdFileCount });
  } catch (err) {
    console.error('Error fetching R2 storage size:', err);
    // Fallback to summing database file sizes
    try {
      const mdFileCount = await KnowledgeFile.countDocuments({ name: /\.md$/i });
      const files = await KnowledgeFile.find({});
      let totalSize = 0;
      for (const f of files) {
        const parts = f.size.split(' ');
        const value = parseFloat(parts[0]) || 0;
        const unit = parts[1] ? parts[1].toUpperCase() : 'KB';
        if (unit === 'MB') totalSize += value * 1024 * 1024;
        else if (unit === 'GB') totalSize += value * 1024 * 1024 * 1024;
        else if (unit === 'KB') totalSize += value * 1024;
        else totalSize += value;
      }
      let formattedSize = '0 B';
      if (totalSize > 0) {
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(totalSize) / Math.log(k));
        formattedSize = parseFloat((totalSize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      }
      return res.status(200).json({ storageSize: formattedSize, mdFileCount });
    } catch (dbErr) {
      next(err);
    }
  }
};

module.exports = {
  getDataSources,
  addDataSource,
  getFiles,
  uploadFile,
  seedKnowledgeBase,
  editDataSource,
  deleteDataSource,
  deleteFile,
  editFile,
  viewFileContent,
  getBucketSize
};

