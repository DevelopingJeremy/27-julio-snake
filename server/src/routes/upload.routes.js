
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
console.log("En routes");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');
const ALLOWED_UPLOAD_TYPES = new Set(['image', 'video', 'audio', 'file']);

const ensureUploadDir = () => {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
};

ensureUploadDir();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const requestedType = typeof req.body.category === 'string'
        ? req.body.category.trim().toLowerCase()
        : typeof req.body.type === 'string'
            ? req.body.type.trim().toLowerCase()
            : '';
    if (!ALLOWED_UPLOAD_TYPES.has(requestedType)) {
        return res.status(400).json({ message: 'Invalid file type category.' });
    }

    console.log('[upload] file saved', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        destination: req.file.destination,
        path: req.file.path,
        existsAfterSave: fs.existsSync(req.file.path),
        requestedType
    });

    res.json({ 
        filename: req.file.filename,
        type: requestedType,
        category: requestedType
    });
});

export default router;
