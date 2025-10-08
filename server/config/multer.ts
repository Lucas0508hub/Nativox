import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'audio/wav', 
  'audio/mpeg', 
  'audio/mp4', 
  'audio/x-m4a', 
  'audio/mp3'
];

const ALLOWED_EXTENSIONS = ['.wav', '.mp3', '.m4a'];
const MAX_FILE_SIZE = 500 * 1024 * 1024;

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => 
    file.originalname.toLowerCase().endsWith(ext)
  );
  
  if (hasValidMime || hasValidExtension) {
    cb(null, true);
  } else {
    cb(new Error('Formato de arquivo não suportado. Use WAV, MP3 ou M4A.'));
  }
};

const filenameGenerator = (req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
  const ext = path.extname(file.originalname);
  const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
  cb(null, name);
};

export const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: filenameGenerator
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter
});

export { uploadDir };
