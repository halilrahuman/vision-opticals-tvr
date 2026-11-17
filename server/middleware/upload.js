const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure upload directory exists
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

// Multer memory storage (allows Jimp to optimize before writing to disk)
const imageStorage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/i;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowed.test(ext) || allowed.test(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP, GIF) are allowed.'));
  }
};

const uploadImages = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: imageFileFilter
});

// Disk storage for CSV uploads
const csvDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = 'import_' + Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueName);
  }
});

const uploadCSV = multer({
  storage: csvDiskStorage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

module.exports = {
  uploadImages,
  uploadCSV
};
