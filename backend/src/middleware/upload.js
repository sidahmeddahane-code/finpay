const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder:          'finpay/uploads',
      resource_type:   'auto',
      public_id:       `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      // Removed allowed_formats to allow Cloudinary to accept the types we filter
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    // Permet un spectre très large de documents et d'images
    const allowedExtensions = /\.(jpeg|jpg|png|webp|gif|pdf|doc|docx|xls|xlsx|csv|txt|zip|rar)$/i;
    const isImage = file.mimetype.startsWith('image/');
    
    if (allowedExtensions.test(file.originalname) || isImage) {
        return cb(null, true);
    }
    cb(new Error('Format non supporté. Veuillez uploader une image, un PDF, Word, Excel, texte, ou archive.'));
  },
});

module.exports = upload;
