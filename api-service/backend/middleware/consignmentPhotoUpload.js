import multer from 'multer';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const consignmentPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 4 * 1024 * 1024, fields: 12, parts: 18 },
  fileFilter(req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error('Solo se aceptan fotos JPG, PNG o WebP.');
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  }
});
