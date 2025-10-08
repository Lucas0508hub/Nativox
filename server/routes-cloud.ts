import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { createStorageService } from "./storage/cloudStorage";
import type { Language } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertProjectSchema, updateSegmentSchema } from "@shared/schema";
import archiver from "archiver";
import ffmpeg from "fluent-ffmpeg";

// Initialize cloud storage service
const cloudStorage = createStorageService();

// Configure multer for file uploads (temporary storage before cloud upload)
const uploadDir = path.join(process.cwd(), "temp-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
      cb(null, name);
    }
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/mp3'];
    const allowedExtensions = ['.wav', '.mp3', '.m4a'];
    
    const hasValidMime = allowedMimes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (hasValidMime || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo não suportado. Use WAV, MP3 ou M4A.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      storage: process.env.STORAGE_PROVIDER || 'local'
    });
  });

  // Serve segment audio with cloud storage support
  app.get('/api/segments/:id/audio', isAuthenticated, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const segment = await storage.getSegment(segmentId);
      
      if (!segment) {
        return res.status(404).json({ message: "Segmento não encontrado" });
      }

      // Check if segment has cloud storage URL
      if (segment.fileUrl) {
        // Redirect to cloud storage URL
        return res.redirect(segment.fileUrl);
      }

      // Fallback to local file system
      if (!segment.filePath || !fs.existsSync(segment.filePath)) {
        return res.status(404).json({ message: "Arquivo de áudio não encontrado" });
      }

      // Serve local file with range support
      const stats = fs.statSync(segment.filePath);
      const fileSize = stats.size;
      
      const ext = path.extname(segment.filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
      };
      const mimeType = mimeTypes[ext] || 'audio/wav';
      
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        const stream = fs.createReadStream(segment.filePath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
        });
        
        stream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
        });
        
        const stream = fs.createReadStream(segment.filePath);
        stream.pipe(res);
      }
    } catch (error) {
      console.error("Error serving audio:", error);
      res.status(500).json({ message: "Erro ao servir arquivo de áudio" });
    }
  });

  // Upload batch with cloud storage
  app.post('/api/upload-batch', isAuthenticated, upload.array('files', 50), async (req: any, res) => {
    try {
      const { projectName, languageId } = req.body;
      const userId = req.user.claims.sub;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      if (!projectName || !languageId) {
        return res.status(400).json({ message: "Nome do projeto e idioma são obrigatórios" });
      }

      // Get language
      const language = await storage.getLanguageById(parseInt(languageId));
      if (!language) {
        return res.status(400).json({ message: "Idioma não encontrado" });
      }

      // Create project
      const project = await storage.createProject({
        name: projectName,
        originalFilename: files[0].originalname,
        filePath: '', // Will be updated with cloud storage info
        duration: 0, // Will be calculated
        sampleRate: 44100,
        channels: 1,
        languageId: parseInt(languageId),
        userId: userId,
        status: 'processing',
        totalSegments: files.length
      });

      // Create folder
      const folder = await storage.createFolder({
        projectId: project.id,
        name: 'Padrão',
        description: 'Pasta padrão para segmentos'
      });

      // Process each file
      const segments = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Get audio duration
          const duration = await getAudioDuration(file.path);
          
          // Upload to cloud storage
          const fileKey = cloudStorage.generateKey(file.originalname, project.id);
          const uploadResult = await cloudStorage.uploadFile(
            file.path,
            fileKey,
            file.mimetype
          );

          // Create segment with cloud storage info
          const segment = await storage.createSegment({
            folderId: folder.id,
            projectId: project.id,
            originalFilename: file.originalname,
            filePath: file.path, // Keep for backward compatibility
            fileUrl: uploadResult.url,
            fileKey: uploadResult.key,
            fileSize: uploadResult.size,
            mimeType: uploadResult.mimeType,
            duration: duration,
            segmentNumber: i + 1,
            startTime: 0,
            endTime: duration,
            confidence: 1.0,
            processingMethod: 'basic'
          });

          segments.push(segment);

          // Clean up temporary file
          fs.unlinkSync(file.path);

        } catch (fileError) {
          console.error(`Error processing file ${file.originalname}:`, fileError);
          // Clean up temporary file even on error
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      // Update project with total segments
      await storage.updateProject(project.id, {
        totalSegments: segments.length,
        status: 'ready_for_transcription'
      });

      res.json({
        message: `${segments.length} arquivos processados com sucesso`,
        projectId: project.id,
        folderId: folder.id,
        segments: segments.length
      });

    } catch (error) {
      console.error("Error in batch upload:", error);
      res.status(500).json({ message: "Erro ao processar upload" });
    }
  });

  // Get languages
  app.get('/api/languages', async (req, res) => {
    try {
      const languages = await storage.getLanguages();
      res.json(languages);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ message: "Erro ao buscar idiomas" });
    }
  });

  // Get projects
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let projects;
      if (user?.role === 'manager') {
        projects = await storage.getAllProjects();
      } else {
        projects = await storage.getUserProjects(userId);
      }
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Erro ao buscar projetos" });
    }
  });

  // Get segments for a folder
  app.get('/api/folders/:folderId/segments', isAuthenticated, async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.folderId);
      const segments = await storage.getFolderSegments(folderId);
      res.json(segments);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ message: "Erro ao buscar segmentos" });
    }
  });

  // Update segment transcription
  app.patch('/api/segments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const { transcription, translation } = req.body;
      const userId = req.user.claims.sub;

      const updatedSegment = await storage.updateSegment(segmentId, {
        transcription,
        translation,
        isTranscribed: true,
        transcribedBy: userId,
        transcribedAt: new Date()
      });

      res.json(updatedSegment);
    } catch (error) {
      console.error("Error updating segment:", error);
      res.status(500).json({ message: "Erro ao atualizar segmento" });
    }
  });

  // Get user info
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to get audio duration
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error getting audio duration:', err);
        resolve(0); // Default to 0 if we can't get duration
      } else {
        resolve(metadata.format.duration || 0);
      }
    });
  });
}
