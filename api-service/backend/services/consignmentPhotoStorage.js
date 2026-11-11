import mongoose from 'mongoose';
import path from 'node:path';

const getBucket = () => {
  if (!mongoose.connection.db) throw new Error('MongoDB no está disponible para guardar las fotos.');
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'consignmentPhotos' });
};

const hasValidImageSignature = (file) => {
  const bytes = file.buffer;
  if (file.mimetype === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (file.mimetype === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  return false;
};

const uploadOne = (file) => new Promise((resolve, reject) => {
  if (!hasValidImageSignature(file)) return reject(new Error('Una de las fotos no tiene un formato de imagen válido.'));
  const safeName = path.basename(file.originalname || 'foto').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
  const stream = getBucket().openUploadStream(safeName || 'foto', {
    contentType: file.mimetype,
    metadata: { purpose: 'consignment', uploadedAt: new Date() }
  });
  stream.once('error', reject);
  stream.once('finish', () => resolve({
    fileId: stream.id,
    name: safeName || 'foto',
    contentType: file.mimetype,
    size: file.size
  }));
  stream.end(file.buffer);
});

export const storeConsignmentPhotos = async (files = []) => {
  const stored = [];
  try {
    for (const file of files) stored.push(await uploadOne(file));
    return stored;
  } catch (error) {
    await deleteConsignmentPhotos(stored).catch(() => {});
    throw error;
  }
};

export const deleteConsignmentPhotos = async (photos = []) => {
  const bucket = getBucket();
  await Promise.all(photos.map(async (photo) => {
    const id = photo?.fileId || photo;
    if (id && mongoose.isValidObjectId(id)) {
      try { await bucket.delete(new mongoose.Types.ObjectId(id)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }));
};

export const openConsignmentPhoto = (fileId) => getBucket().openDownloadStream(new mongoose.Types.ObjectId(fileId));
