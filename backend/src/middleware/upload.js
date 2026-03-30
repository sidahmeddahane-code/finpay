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
    const isImage = /jpeg|jpg|png/.test(file.mimetype);
    return {
      folder:         'finpay/uploads',
      resource_type:  isImage ? 'image' : 'raw',
      format:         isImage ? undefined : 'pdf',
      public_id:      `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk  = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Seuls les fichiers images (jpeg, jpg, png) et PDF sont acceptés.'));
  },
});

module.exports = upload;
