// filepath: c:\Users\advatech\Desktop\build\Server\middleware\multerConfig.js
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video_url') {
      cb(null, 'uploads/videos/');
    } else if (file.fieldname === 'image_url') {
      cb(null, 'uploads/images/');
    } else {
      cb(new Error('Invalid field name'), false);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video_url') {
    // Accept only video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  } else if (file.fieldname === 'image_url') {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  } else {
    cb(new Error('Invalid field name'), false);
  }
};

const limits = {
  fileSize: 1024 * 1024 * 1024 // 1GB max per file (adjust as needed)
};

const upload = multer({ storage, fileFilter, limits });

export default upload;