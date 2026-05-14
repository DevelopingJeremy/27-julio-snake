
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

    console.log('[upload] file saved', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        destination: req.file.destination,
        path: req.file.path,
        existsAfterSave: fs.existsSync(req.file.path)
    });
    
    // Determine type based on mimetype or extension
    const ext = path.extname(req.file.originalname).toLowerCase();
    let type = 'file';
    
    if (req.file.mimetype.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        type = 'image';
    } else if (req.file.mimetype.startsWith('video/') || ['.mp4', '.webm', '.ogg', '.mov', '.avi'].includes(ext)) {
        type = 'video';
    } else if (req.file.mimetype.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'].includes(ext)) {
        type = 'audio';
    }

    res.json({ 
        filename: req.file.filename,
        type: type
    });
});

export default router;
