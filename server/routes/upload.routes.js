const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');
const { processAndSaveImage } = require('../services/imageService');

// POST /api/upload — Single or multi-file upload
router.post('/', requireAuth, uploadImages.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files provided.' });
    }

    const savedImages = [];
    for (const file of req.files) {
      const result = await processAndSaveImage(file.buffer, file.originalname);
      savedImages.push(result);
    }

    res.json({
      success: true,
      message: `Successfully uploaded and optimized ${savedImages.length} image(s)!`,
      images: savedImages,
      files: savedImages,
      // Convenience field for single image uploads:
      url: savedImages[0].url,
      thumbnailUrl: savedImages[0].thumbnailUrl
    });
  } catch (err) {
    console.error('Upload processing error:', err);
    res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
});

// GET /api/upload/library — Photo library listing
router.get('/library', requireAuth, async (req, res) => {
  try {
    const listFiles = (dir, prefix) => {
      if (!fs.existsSync(dir)) return [];
      const files = fs.readdirSync(dir);
      return files
        .filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f) && !f.startsWith('thumb_'))
        .map(f => {
          const fullPath = path.join(dir, f);
          const stat = fs.statSync(fullPath);
          return {
            name: f,
            url: `${prefix}/${f}`,
            size: stat.size,
            updatedAt: stat.mtime
          };
        });
    };

    const imagesDir = path.join(config.PUBLIC_DIR, 'images');
    const uploadsDir = config.UPLOAD_DIR;

    const brandImages = listFiles(imagesDir, 'images');
    const uploadImages = listFiles(uploadsDir, 'uploads');

    const allImages = [...uploadImages, ...brandImages].sort((a, b) => b.updatedAt - a.updatedAt);

    res.json({
      success: true,
      count: allImages.length,
      images: allImages,
      files: allImages
    });
  } catch (err) {
    console.error('Error fetching image library:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/upload — Delete an uploaded image file
router.delete('/', requireAuth, async (req, res) => {
  try {
    const rawTarget = req.body.url || req.body.filename;
    if (!rawTarget) {
      return res.status(400).json({ success: false, message: 'Image URL or filename is required.' });
    }

    const filename = path.basename(rawTarget);
    const filePath = path.join(config.UPLOAD_DIR, filename);
    const thumbPath = path.join(config.UPLOAD_DIR, 'thumb_' + filename);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);

    res.json({ success: true, message: 'Photo deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
