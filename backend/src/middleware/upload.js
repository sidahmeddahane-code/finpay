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
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'], // Strictly limit back to images and PDFs
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    // Uniquement images et PDF
    const allowedExtensions = /\.(jpeg|jpg|png|pdf)$/i;
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    
    if (allowedExtensions.test(file.originalname) && (isImage || isPdf)) {
        return cb(null, true);
    }
    cb(new Error('Format non supporté. Veuillez uploader uniquement un document PDF ou une photo (JPG, PNG).'));
  },
});

module.exports = upload;
