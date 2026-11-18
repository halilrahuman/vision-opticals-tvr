const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');
const config = require('../config');

/**
 * Optimizes an uploaded image buffer and creates a thumbnail.
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} originalName - Original uploaded filename
 * @returns {Promise<{url: string, thumbnailUrl: string, filename: string}>}
 */
async function processAndSaveImage(buffer, originalName) {
  const timestamp = Date.now();
  const safeName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `${safeName}_${timestamp}.jpg`;
  const thumbFilename = `thumb_${safeName}_${timestamp}.jpg`;

  const outputPath = path.join(config.UPLOAD_DIR, filename);
  const thumbPath = path.join(config.UPLOAD_DIR, thumbFilename);

  try {
    const image = await Jimp.read(buffer);

    // 1. Save optimized high-res version (max width 1200px)
    if (image.bitmap.width > 1200) {
      image.resize(1200, Jimp.AUTO);
    }
    image.quality(85);
    await image.writeAsync(outputPath);

    // 2. Save thumbnail (square cover 320x320)
    const thumb = image.clone();
    thumb.cover(320, 320).quality(80);
    await thumb.writeAsync(thumbPath);

    return {
      url: `uploads/${filename}`,
      thumbnailUrl: `uploads/${thumbFilename}`,
      filename
    };
  } catch (err) {
    console.warn('Jimp optimization warning, writing original buffer:', err.message);
    // Fallback: write original buffer directly
    const fallbackFilename = `${safeName}_${timestamp}${path.extname(originalName) || '.jpg'}`;
    const fallbackPath = path.join(config.UPLOAD_DIR, fallbackFilename);
    fs.writeFileSync(fallbackPath, buffer);

    return {
      url: `uploads/${fallbackFilename}`,
      thumbnailUrl: `uploads/${fallbackFilename}`,
      filename: fallbackFilename
    };
  }
}

module.exports = {
  processAndSaveImage
};
