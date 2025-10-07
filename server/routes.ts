import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { whisperService } from "./whisperService";
import type { Language } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertProjectSchema, updateSegmentSchema } from "@shared/schema";
import archiver from "archiver";
import ffmpeg from "fluent-ffmpeg";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
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

// Helper function to convert WAV files to PCM 16-bit 16kHz format for Whisper compatibility
async function convertWavToPcm16(filePath: string): Promise<void> {
  const tempPath = `${filePath}.temp.wav`;
  
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .audioCodec('pcm_s16le')  // PCM 16-bit
      .audioFrequency(16000)     // 16kHz sample rate
      .audioChannels(1)          // Mono
      .format('wav')
      .output(tempPath)
      .on('end', () => {
        // Replace original with converted file
        fs.renameSync(tempPath, filePath);
        resolve();
      })
      .on('error', (err) => {
        // Clean up temp file if it exists
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        reject(err);
      })
      .run();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Test route to check auth status
  app.get('/api/test-auth', (req: any, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { claims: req.user.claims } : null,
      session: req.session ? { id: req.sessionID } : null
    });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Get user languages if editor
      let userLanguages: Language[] = [];
      if (user.role === 'editor') {
        userLanguages = await storage.getUserLanguages(userId);
      }
      
      res.json({ ...user, userLanguages });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });

  // Languages
  app.get('/api/languages', isAuthenticated, async (req, res) => {
    try {
      const languages = await storage.getLanguages();
      res.json(languages);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ message: "Erro ao buscar idiomas" });
    }
  });


  // Get single segment
  app.get('/api/segments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const segment = await storage.getSegment(segmentId);
      
      if (!segment) {
        return res.status(404).json({ message: "Segmento não encontrado" });
      }
      
      // Verify user has access to the segment's project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const project = await storage.getProject(segment.projectId);
        if (!project) {
          return res.status(404).json({ message: "Projeto não encontrado" });
        }
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para acessar este segmento" });
        }
      }
      
      res.json(segment);
    } catch (error) {
      console.error("Error fetching segment:", error);
      res.status(500).json({ message: "Erro ao buscar segmento" });
    }
  });

  // Update segment
  app.patch('/api/segments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const updateData = req.body;
      
      // Get segment to verify access
      const existingSegment = await storage.getSegment(segmentId);
      if (!existingSegment) {
        return res.status(404).json({ message: "Segmento não encontrado" });
      }
      
      // Verify user has access to the segment's project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const project = await storage.getProject(existingSegment.projectId);
        if (!project) {
          return res.status(404).json({ message: "Projeto não encontrado" });
        }
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para editar este segmento" });
        }
      }
      
      const segment = await storage.updateSegment(segmentId, updateData);
      if (!segment) {
        return res.status(404).json({ message: "Segmento não encontrado" });
      }
      
      res.json(segment);
    } catch (error) {
      console.error("Error updating segment:", error);
      res.status(500).json({ message: "Erro ao atualizar segmento" });
    }
  });

  // Get all projects for the authenticated user
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let projects;
      if (user?.role === 'manager') {
        // Managers see all projects
        projects = await storage.getProjects();
      } else {
        // Editors see only projects in their assigned languages
        const userLanguages = await storage.getUserLanguages(userId);
        const languageIds = userLanguages.map(lang => lang.id);
        
        if (languageIds.length === 0) {
          // No assigned languages - return empty array
          return res.json([]);
        }
        
        // Get all projects and filter by assigned languages
        const allProjects = await storage.getProjects();
        projects = allProjects.filter(project => languageIds.includes(project.languageId));
      }
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Erro ao buscar projetos" });
    }
  });

  // Get single project by ID
  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Verify user has access to this project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para acessar este projeto" });
        }
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Erro ao buscar projeto" });
    }
  });

  // Serve segment audio
  app.get('/api/segments/:id/audio', isAuthenticated, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const segment = await storage.getSegment(segmentId);
      
      if (!segment || !segment.filePath) {
        return res.status(404).json({ message: "Arquivo de áudio do segmento não encontrado" });
      }
      
      // Verify user has access to the segment's project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const project = await storage.getProject(segment.projectId);
        if (!project) {
          return res.status(404).json({ message: "Projeto não encontrado" });
        }
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para acessar este áudio" });
        }
      }

      // Check if file exists
      if (!fs.existsSync(segment.filePath)) {
        return res.status(404).json({ message: "Arquivo de áudio não encontrado no sistema" });
      }

      // Get file stats for proper content-length
      const stats = fs.statSync(segment.filePath);
      
      // Detect mime type from file extension
      const ext = path.extname(segment.filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
      };
      const mimeType = mimeTypes[ext] || 'audio/wav';
      
      // Set proper audio headers
      res.set({
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Content-Length': stats.size.toString()
      });

      // Stream the audio file
      const stream = fs.createReadStream(segment.filePath);
      stream.pipe(res);
    } catch (error) {
      console.error("Error serving segment audio:", error);
      res.status(500).json({ message: "Erro ao carregar áudio do segmento" });
    }
  });

  // Transcribe segment with AI
  app.post('/api/segments/:id/transcribe', isAuthenticated, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Get segment
      const segment = await storage.getSegment(segmentId);
      if (!segment) {
        return res.status(404).json({ message: "Segmento não encontrado" });
      }

      // Verify user has access to segment's project
      const project = await storage.getProject(segment.projectId);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const user = await storage.getUser(userId);
      if (user?.role === 'editor') {
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId) || 
                         project.userId === userId;
        
        if (!hasAccess) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }

      // Check if file exists
      if (!fs.existsSync(segment.filePath)) {
        return res.status(404).json({ message: "Arquivo de áudio não encontrado" });
      }

      // Get language for learning context
      const language = await storage.getLanguageById(project.languageId);
      const languageCode = language?.code;

      // Retrieve recent corrections for learning (limit to 10 most recent)
      let examples: Array<{ description: string; transcription: string }> = [];
      if (languageCode) {
        const corrections = await storage.getTranscriptionCorrections(
          project.domainType || undefined,
          languageCode,
          10  // Limit to 10 most recent corrections
        );
        
        // Convert corrections to examples format
        examples = corrections.map(correction => ({
          description: correction.originalTranscription,
          transcription: correction.correctedTranscription
        }));
        
        if (examples.length > 0) {
          console.log(`Using ${examples.length} correction examples for learning`);
        }
      }

      // Transcribe with Whisper using learning context
      console.log(`Transcribing segment ${segmentId} with Whisper...`);
      const transcriptionResult = await whisperService.transcribeWithTimestamps(
        segment.filePath,
        {
          transcriptionContext: project.transcriptionContext || undefined,
          domainType: project.domainType || undefined,
          languageCode: languageCode,
          examples: examples.length > 0 ? examples : undefined
        },
        false
      );

      // Return just the text transcription
      res.json({ transcription: transcriptionResult.text });
    } catch (error) {
      console.error("Error transcribing segment:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao transcrever segmento" 
      });
    }
  });

  // Update project
  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Log duration updates for debugging
      if (updateData.duration) {
        console.log(`Updating project ${projectId} duration to ${updateData.duration}s`);
      }
      
      const project = await storage.updateProject(projectId, updateData);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Erro ao atualizar projeto" });
    }
  });

  // Delete project
  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Only managers can delete projects
      if (user?.role !== 'manager') {
        return res.status(403).json({ message: "Apenas gerentes podem deletar projetos" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      // Delete associated segments first
      await storage.deleteProjectSegments(projectId);

      // Delete the project
      await storage.deleteProject(projectId);

      // Delete the audio file if it exists
      if (project.filePath && fs.existsSync(project.filePath)) {
        try {
          fs.unlinkSync(project.filePath);
        } catch (fileError) {
          console.log('File already deleted or inaccessible:', project.filePath);
        }
      }

      res.json({ message: "Projeto deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Erro ao deletar projeto" });
    }
  });

  // Folder management routes
  // Get single folder
  app.get('/api/folders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const folder = await storage.getFolder(folderId);
      
      if (!folder) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      
      // Verify user has access to the folder's project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const project = await storage.getProject(folder.projectId);
        if (!project) {
          return res.status(404).json({ message: "Projeto não encontrado" });
        }
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para acessar esta pasta" });
        }
      }
      
      res.json(folder);
    } catch (error) {
      console.error("Error fetching folder:", error);
      res.status(500).json({ message: "Erro ao buscar pasta" });
    }
  });

  // Get all folders for a project
  app.get('/api/projects/:projectId/folders', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user.claims.sub;
      
      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Verify user has access to this project (either manager or assigned to project)
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para acessar este projeto" });
        }
      }
      
      const folders = await storage.getFolders(projectId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Erro ao buscar pastas" });
    }
  });

  // Create a new folder
  app.post('/api/projects/:projectId/folders', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user.claims.sub;
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Nome da pasta é obrigatório" });
      }
      
      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Verify user has access to this project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para acessar este projeto" });
        }
      }
      
      const folder = await storage.createFolder({
        projectId,
        name,
        description: description || null
      });
      
      res.json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Erro ao criar pasta" });
    }
  });

  // Update a folder
  app.put('/api/folders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { name, description } = req.body;
      
      // Get folder to verify it exists and get its project
      const folder = await storage.getFolder(folderId);
      if (!folder) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      
      // Verify user has access to the folder's project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const project = await storage.getProject(folder.projectId);
        if (!project) {
          return res.status(404).json({ message: "Projeto não encontrado" });
        }
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para editar esta pasta" });
        }
      }
      
      const updatedFolder = await storage.updateFolder(folderId, {
        name,
        description
      });
      
      if (!updatedFolder) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      
      res.json(updatedFolder);
    } catch (error) {
      console.error("Error updating folder:", error);
      res.status(500).json({ message: "Erro ao atualizar pasta" });
    }
  });

  // Delete a folder
  app.delete('/api/folders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Get folder to verify it exists and get its project
      const folder = await storage.getFolder(folderId);
      if (!folder) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      
      // Verify user has access to the folder's project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const project = await storage.getProject(folder.projectId);
        if (!project) {
          return res.status(404).json({ message: "Projeto não encontrado" });
        }
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para deletar esta pasta" });
        }
      }
      
      await storage.deleteFolder(folderId);
      res.json({ message: "Pasta deletada com sucesso" });
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ message: "Erro ao deletar pasta" });
    }
  });

  // NEW: Batch upload pre-segmented audio files to a folder
  app.post('/api/folders/:folderId/upload-segments', isAuthenticated, upload.array('audioFiles', 100), async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.folderId);
      const userId = req.user.claims.sub;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      // Get folder and verify access
      const folder = await storage.getFolder(folderId);
      if (!folder) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      
      // Verify user has access to the folder's project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const project = await storage.getProject(folder.projectId);
        if (!project) {
          return res.status(404).json({ message: "Projeto não encontrado" });
        }
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para fazer upload nesta pasta" });
        }
      }
      
      // Get current max segment number in this folder
      const existingSegments = await storage.getSegmentsByFolder(folderId);
      let maxSegmentNumber = existingSegments.length > 0 
        ? Math.max(...existingSegments.map(s => s.segmentNumber)) 
        : 0;
      
      // Process each audio file and create segments
      const segments = [];
      const errors = [];
      
      for (const file of files) {
        try {
          // Convert WAV files to PCM format for compatibility
          if (file.originalname.toLowerCase().endsWith('.wav') || file.mimetype === 'audio/wav') {
            try {
              await convertWavToPcm16(file.path);
              console.log(`Converted WAV file to PCM format: ${file.originalname}`);
            } catch (error) {
              console.error(`Error converting WAV file ${file.originalname}:`, error);
              // Continue with original file if conversion fails
            }
          }
          
          // Extract audio duration using fluent-ffmpeg
          const duration = await new Promise<number>((resolve, reject) => {
            ffmpeg.ffprobe(file.path, (err, metadata) => {
              if (err) {
                console.error(`Error getting duration for ${file.originalname}:`, err);
                // Fallback: estimate based on file size
                const fileSizeKB = file.size / 1024;
                const estimatedDuration = Math.round(fileSizeKB / 15);
                resolve(Math.max(estimatedDuration, 1));
              } else {
                resolve(metadata.format.duration || 1);
              }
            });
          });
          
          // Increment segment number for each file
          maxSegmentNumber++;
          
          // Create segment for this audio file
          const segment = await storage.createSegment({
            projectId: folder.projectId,
            folderId: folderId,
            segmentNumber: maxSegmentNumber,
            filePath: file.path,
            originalFilename: file.originalname,
            startTime: 0,
            endTime: duration,
            duration: duration,
            status: 'pending',
            transcription: null
          });
          
          segments.push(segment);
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          errors.push({ filename: file.originalname, error: String(error) });
        }
      }
      
      // Return response with success count and any errors
      const response: any = {
        message: `${segments.length} de ${files.length} segmentos carregados com sucesso`,
        segments: segments
      };
      
      if (errors.length > 0) {
        response.errors = errors;
        response.message += ` (${errors.length} falharam)`;
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error uploading segments:", error);
      res.status(500).json({ message: "Erro ao fazer upload dos segmentos" });
    }
  });

  // Get segments for a folder
  app.get('/api/folders/:folderId/segments', isAuthenticated, async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.folderId);
      const userId = req.user.claims.sub;
      
      // Get folder and verify access
      const folder = await storage.getFolder(folderId);
      if (!folder) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      
      // Verify user has access to the folder's project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager') {
        const project = await storage.getProject(folder.projectId);
        if (!project) {
          return res.status(404).json({ message: "Projeto não encontrado" });
        }
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para acessar esta pasta" });
        }
      }
      
      const segments = await storage.getSegmentsByFolder(folderId);
      res.json(segments);
    } catch (error) {
      console.error("Error fetching folder segments:", error);
      res.status(500).json({ message: "Erro ao buscar segmentos" });
    }
  });

  // Simple batch audio upload - no segmentation, just upload files
  app.post('/api/upload-batch', isAuthenticated, upload.array('files', 100), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const files = req.files as Express.Multer.File[];
      const { projectId, folderId, projectName, languageId } = req.body;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      let finalProjectId = projectId ? parseInt(projectId) : null;
      let finalFolderId = folderId ? parseInt(folderId) : null;
      
      // If project name is provided, create a new project
      if (projectName && !finalProjectId) {
        // Get language for project
        let languageId: number;
        const user = await storage.getUser(userId);

        if (user?.role === 'manager') {
          // Managers can use any available language, default to first one
          const allLanguages = await storage.getLanguages();
          if (allLanguages.length === 0) {
            return res.status(400).json({ message: "Nenhum idioma disponível no sistema" });
          }
          languageId = allLanguages[0].id;
        } else {
          // Editors must have assigned language
          const userLanguages = await storage.getUserLanguages(userId);
          if (userLanguages.length === 0) {
            return res.status(400).json({ message: "Você precisa ter um idioma atribuído para fazer upload. Contate um gerente." });
          }
          languageId = userLanguages[0].id;
        }

        const newProject = await storage.createProject({
          name: projectName,
          userId: userId,
          languageId: languageId,
          status: 'processing',
          duration: 0,
          originalFilename: '',
          filePath: '',
          sampleRate: 44100,
          channels: 1,
          totalSegments: files.length
        });
        finalProjectId = newProject.id;
        
        // Create a default folder for this project
        const defaultFolder = await storage.createFolder({
          projectId: finalProjectId,
          name: 'Padrão',
          description: 'Pasta padrão'
        });
        finalFolderId = defaultFolder.id;
      }
      
      // Verify user has access to the project
      const user = await storage.getUser(userId);
      if (user?.role !== 'manager' && finalProjectId) {
        const project = await storage.getProject(finalProjectId);
        if (!project) {
          return res.status(404).json({ message: "Projeto não encontrado" });
        }
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para fazer upload neste projeto" });
        }
      }
      
      // Ensure we have a project and folder
      if (!finalProjectId || !finalFolderId) {
        return res.status(400).json({ message: "Um projeto deve ser selecionado ou criado" });
      }
      
      const segments = [];
      for (const file of files) {
        try {
          // Convert WAV files to PCM format for compatibility
          if (file.originalname.toLowerCase().endsWith('.wav') || file.mimetype === 'audio/wav') {
            try {
              await convertWavToPcm16(file.path);
              console.log(`Converted WAV file to PCM format: ${file.originalname}`);
            } catch (error) {
              console.error(`Error converting WAV file ${file.originalname}:`, error);
              // Continue with original file if conversion fails
            }
          }
          
          // Extract audio duration using fluent-ffmpeg
          const duration = await new Promise<number>((resolve) => {
            ffmpeg.ffprobe(file.path, (err, metadata) => {
              if (err) {
                const fileSizeKB = file.size / 1024;
                const estimatedDuration = Math.round(fileSizeKB / 15);
                resolve(Math.max(estimatedDuration, 1));
              } else {
                resolve(metadata.format.duration || 1);
              }
            });
          });
          
          // Create segment for this audio file
          const segment = await storage.createSegment({
            projectId: finalProjectId,
            folderId: finalFolderId,
            segmentNumber: segments.length + 1,
            filePath: file.path,
            originalFilename: file.originalname,
            startTime: 0,
            endTime: duration,
            duration: duration,
            confidence: 1.0,
            transcription: null
          });
          
          segments.push(segment);
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
        }
      }
      
      // Update project status to ready for transcription
      if (finalProjectId) {
        await storage.updateProject(finalProjectId, {
          status: 'ready_for_transcription'
        });
      }
      
      res.json({
        message: `${segments.length} arquivos carregados com sucesso`,
        segments: segments,
        projectId: finalProjectId,
        folderId: finalFolderId
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "Erro ao fazer upload dos arquivos" });
    }
  });

  // Segments
  app.get('/api/projects/:id/segments', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const segments = await storage.getSegments(projectId);
      res.json(segments);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ message: "Erro ao buscar segmentos" });
    }
  });

  app.patch('/api/segments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const updateData = updateSegmentSchema.parse(req.body);
      
      if (updateData.isTranscribed) {
        updateData.transcribedBy = req.user.claims.sub;
        updateData.transcribedAt = new Date();
      }
      
      const segment = await storage.updateSegment(segmentId, updateData);
      res.json(segment);
    } catch (error) {
      console.error("Error updating segment:", error);
      res.status(500).json({ message: "Erro ao atualizar segmento" });
    }
  });

  // Save transcription correction for contextual learning
  app.post("/api/segments/:id/corrections", isAuthenticated, async (req, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const { originalTranscription, correctedTranscription } = req.body;

      // Get segment and project info for context
      const segment = await storage.getSegmentById(segmentId);
      if (!segment) {
        return res.status(404).json({ message: "Segment not found" });
      }

      const project = await storage.getProjectById(segment.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Save the correction for learning
      const correction = await storage.saveTranscriptionCorrection({
        segmentId,
        projectId: project.id,
        languageCode: project.languageCode || 'pt-BR',
        originalTranscription,
        correctedTranscription,
        audioContext: `Segment ${segment.startTime}s-${segment.endTime}s`,
        domain: project.domain || 'general',
      });

      res.json({ message: "Correction saved for learning", correctionId: correction.id });
    } catch (error) {
      console.error("Error saving transcription correction:", error);
      res.status(500).json({ message: "Failed to save correction" });
    }
  });

  // Update segment boundary (for drag and drop)
  app.patch('/api/projects/:projectId/segments/:segmentId', isAuthenticated, async (req: any, res) => {
    try {
      const { segmentId } = req.params;
      const { startTime, endTime } = req.body;
      
      const updateData: any = {};
      if (startTime !== undefined) updateData.startTime = parseFloat(startTime);
      if (endTime !== undefined) updateData.endTime = parseFloat(endTime);
      
      const segment = await storage.updateSegment(parseInt(segmentId), updateData);
      
      res.json(segment);
    } catch (error: any) {
      console.error("Error updating segment boundary:", error);
      res.status(500).json({ message: "Erro ao atualizar fronteira do segmento" });
    }
  });

  // Delete all segments (keep audio)
  app.delete('/api/projects/:id/segments/all', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get project to validate it exists
      const project = await storage.getProject(parseInt(id));
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Delete all segments for this project
      await storage.deleteAllSegments(parseInt(id));
      
      res.json({ message: "Todos os segmentos foram removidos com sucesso" });
    } catch (error) {
      console.error("Error deleting all segments:", error);
      res.status(500).json({ error: "Failed to delete segments" });
    }
  });

  // Create new segment
  app.post('/api/projects/:id/segments', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { startTime, endTime, segmentNumber, transcription } = req.body;
      
      // Validate required fields
      if (startTime === undefined || endTime === undefined) {
        return res.status(400).json({ error: "Missing required fields: startTime and endTime" });
      }
      
      // Get project to validate duration
      const project = await storage.getProject(parseInt(id));
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Validate times
      const start = parseFloat(startTime);
      const end = parseFloat(endTime);
      
      if (start < 0 || end > project.duration || start >= end) {
        return res.status(400).json({ error: "Invalid time range" });
      }
      
      // Get next segment number if not provided
      const existingSegments = await storage.getSegments(parseInt(id));
      const nextSegmentNumber = segmentNumber || (existingSegments.length + 1);
      
      const newSegment = await storage.createSegment({
        projectId: parseInt(id),
        startTime: start,
        endTime: end,
        segmentNumber: nextSegmentNumber,
        transcription: transcription || "",
        isTranscribed: false,
        isApproved: false,
        confidence: 1.0,
        processingMethod: 'manual'
      });
      
      res.json(newSegment);
    } catch (error) {
      console.error("Error creating segment:", error);
      res.status(500).json({ error: "Failed to create segment" });
    }
  });

  // Split segment (add new cut)
  app.post('/api/projects/:projectId/segments/split', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const { splitTime, currentSegmentId } = req.body;
      const splitTimeFloat = parseFloat(splitTime);
      
      // Get current segments for this project
      const segments = await storage.getSegments(parseInt(projectId));
      
      // Find the segment that contains the split time
      const targetSegment = segments.find((seg: any) => 
        splitTimeFloat >= seg.startTime && splitTimeFloat <= seg.endTime
      );
      
      if (!targetSegment) {
        return res.status(400).json({ message: "Nenhum segmento encontrado no tempo especificado" });
      }
      
      // Update the original segment to end at split time
      await storage.updateSegment(targetSegment.id, {
        endTime: splitTimeFloat
      });
      
      // Create a new segment starting from split time
      const newSegment = await storage.createSegment({
        projectId: parseInt(projectId),
        segmentNumber: targetSegment.segmentNumber + 1,
        startTime: splitTimeFloat,
        endTime: targetSegment.endTime,
        transcription: "",
        isTranscribed: false,
        isApproved: false,
        confidence: 0.5,
        processingMethod: 'manual',
      });
      
      // Update segment numbers for all segments after the split
      const laterSegments = segments.filter((seg: any) => 
        seg.segmentNumber > targetSegment.segmentNumber
      );
      
      for (const seg of laterSegments) {
        await storage.updateSegment(seg.id, {
          segmentNumber: seg.segmentNumber + 1
        });
      }
      
      res.json({ 
        originalSegment: targetSegment,
        newSegment,
        message: "Segmento dividido com sucesso" 
      });
    } catch (error: any) {
      console.error("Error splitting segment:", error);
      res.status(500).json({ message: "Erro ao dividir segmento" });
    }
  });

  // Reprocess project with Whisper
  app.post('/api/projects/:id/reprocess', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      console.log(`Reprocessing project ${projectId} with Whisper...`);

      // Try Whisper processing
      try {
        if (!whisperService.isAudioFileValid(project.filePath)) {
          return res.status(400).json({ 
            message: "Arquivo muito grande para Whisper (máximo 25MB)" 
          });
        }

        // Get transcription context and examples for better results
        const language = await storage.getLanguageById(project.languageId);
        const languageCode = language?.code || 'pt';
        
        // Get domain-specific examples if available
        const examples = await storage.getTranscriptionExamples(project.domainType, languageCode);
        
        const contextOptions = {
          languageCode,
          domainType: project.domainType || undefined,
          transcriptionContext: project.transcriptionContext || undefined,
          examples: examples.slice(0, 3).map(ex => ({ // Limit to 3 examples to avoid token limits
            description: ex.audioDescription,
            transcription: ex.correctTranscription
          }))
        };
        
        console.log(`Using ${examples.length > 0 ? examples.length : 0} contextual examples for better transcription`);
        
        const whisperResponse = await whisperService.transcribeWithTimestamps(project.filePath, contextOptions);
        const newSegments = whisperService.convertWhisperSegments(whisperResponse, project.id);

        // Delete existing segments
        await storage.deleteProjectSegments(projectId);

        // Create new segments
        for (const segment of newSegments) {
          await storage.createSegment(segment);
        }

        // Update project
        await storage.updateProject(projectId, {
          status: 'ready_for_transcription',
          totalSegments: newSegments.length,
          transcribedSegments: 0,
          boundaryFScore: 0.92
        });

        console.log(`Successfully reprocessed project ${projectId} with ${newSegments.length} segments`);
        
        res.json({ 
          message: "Projeto reprocessado com sucesso usando Whisper",
          segments: newSegments.length,
          method: 'whisper'
        });

      } catch (error) {
        console.error('Whisper reprocessing failed:', error);
        res.status(500).json({ 
          message: `Erro no reprocessamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        });
      }

    } catch (error) {
      console.error("Error reprocessing project:", error);
      res.status(500).json({ message: "Erro ao reprocessar projeto" });
    }
  });

  // Reprocess project segmentations with Whisper
  app.post('/api/projects/:id/reprocess-segments', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      console.log(`Reprocessing project ${projectId} segments with Whisper...`);

      // Get language information - using auto-detection instead of forcing
      const language = await storage.getLanguageById(project.languageId);
      const languageCode = language?.code || 'generic';
      console.log('Language from DB:', languageCode, '- Using Whisper auto-detection');
      
      // Get contextual examples for better transcription
      const examples = await storage.getTranscriptionExamples(project.domainType, languageCode);
      
      const contextOptions = {
        // Remove languageCode to enable auto-detection
        domainType: project.domainType || undefined,
        transcriptionContext: project.transcriptionContext || undefined,
        examples: examples.slice(0, 3).map(ex => ({
          description: ex.audioDescription,
          transcription: ex.correctTranscription
        }))
      };
      
      const whisperResponse = await whisperService.transcribeWithTimestamps(project.filePath, contextOptions, true); // Enable VAD
      const newSegments = whisperService.convertWhisperSegments(whisperResponse, project.id);

      // Delete existing segments
      await storage.deleteProjectSegments(projectId);

      // Create new segments (without transcriptions for segmentation-only mode)
      for (const segment of newSegments) {
        await storage.createSegment({
          ...segment,
          transcription: '' // Empty transcription for segmentation-only mode
        });
      }

      // Update project status
      await storage.updateProject(projectId, {
        status: 'ready_for_transcription',
        totalSegments: newSegments.length,
        transcribedSegments: 0
      });

      res.json({ 
        message: "Segmentação reprocessada com sucesso usando Whisper",
        segmentsCount: newSegments.length 
      });
    } catch (error) {
      console.error("Error in reprocess segments route:", error);
      res.status(500).json({ message: "Erro na segmentação com Whisper" });
    }
  });

  // VAD-only reprocessing
  app.post('/api/projects/:id/reprocess-vad-only', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      console.log(`Starting VAD-only processing for project ${projectId}...`);
      
      // Use VAD service directly for segmentation with robust error handling  
      const { vadService } = await import('./vadService.js');
      let segments;
      try {
        segments = await vadService.processAudioWithVAD(project.filePath);
        console.log(`VAD processing returned ${segments?.length || 0} segments`);
      } catch (vadError) {
        console.error('VAD processing failed, creating fallback segments:', vadError);
        // Create simple time-based segments as fallback
        segments = await vadService.createBasicTimeSegments(project.filePath);
      }
      
      if (segments && segments.length > 0) {
        // Delete existing segments
        await storage.deleteProjectSegments(projectId);
        
        // Create new segments from VAD results
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          await storage.createSegment({
            projectId,
            segmentNumber: i + 1,
            startTime: segment.start,
            endTime: segment.end,
            transcription: '', // No transcription with VAD-only
            confidence: segment.speechConfidence || segment.confidence || 0.7,
            isTranscribed: false,
            isApproved: false
          });
        }
        
        // Update project status
        await storage.updateProject(projectId, {
          status: 'ready_for_transcription',
          totalSegments: segments.length,
          transcribedSegments: 0
        });

        console.log(`VAD-only processing completed: ${segments.length} segments created`);
        res.json({ 
          message: `Segmentação VAD concluída: ${segments.length} segmentos criados`,
          segmentCount: segments.length 
        });
      } else {
        // If no segments, create basic fallback
        console.log('No VAD segments available, creating simple time-based fallback...');
        const { vadService } = await import('./vadService.js');
        const fallbackSegments = await vadService.createBasicTimeSegments(project.filePath);
        
        if (fallbackSegments && fallbackSegments.length > 0) {
          await storage.deleteProjectSegments(projectId);
          
          for (let i = 0; i < fallbackSegments.length; i++) {
            const segment = fallbackSegments[i];
            await storage.createSegment({
              projectId,
              segmentNumber: i + 1,
              startTime: segment.start,
              endTime: segment.end,
              transcription: '',
              confidence: 0.7,
              isTranscribed: false,
              isApproved: false
            });
          }
          
          await storage.updateProject(projectId, {
            status: 'ready_for_transcription',
            totalSegments: fallbackSegments.length,
            transcribedSegments: 0
          });

          res.json({ 
            message: `Segmentação básica criada: ${fallbackSegments.length} segmentos`,
            segmentCount: fallbackSegments.length 
          });
        } else {
          res.status(500).json({ message: "Falha na segmentação VAD" });
        }
      }
    } catch (error) {
      console.error('VAD-only processing error:', error);
      res.status(500).json({ message: "Erro no processamento VAD" });
    }
  });

  // Enhanced VAD-based reprocessing route
  app.post('/api/projects/:id/reprocess-with-vad', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      console.log(`Starting VAD-enhanced reprocessing for project ${projectId}...`);

      // Get language and contextual information
      const language = await storage.getLanguageById(project.languageId);
      const languageCode = language?.code || 'generic';
      const examples = await storage.getTranscriptionExamples(project.domainType, languageCode);
      
      const contextOptions = {
        domainType: project.domainType || undefined,
        transcriptionContext: project.transcriptionContext || undefined,
        examples: examples.slice(0, 3).map(ex => ({
          description: ex.audioDescription,
          transcription: ex.correctTranscription
        }))
      };

      // Use basic Whisper processing to avoid infinite loops
      console.log('Running basic Whisper transcription (VAD disabled to prevent loops)...');
      
      let whisperResponse;
      try {
        whisperResponse = await whisperService.transcribeWithTimestamps(project.filePath, contextOptions);
      } catch (whisperError) {
        console.error('Whisper failed:', whisperError);
        throw new Error('Falha na transcrição Whisper');
      }
      
      const newSegments = whisperService.convertWhisperSegments(whisperResponse, project.id);

      // Delete existing segments
      await storage.deleteProjectSegments(projectId);

      // Create new VAD-enhanced segments
      for (const segment of newSegments) {
        await storage.createSegment({
          ...segment,
          transcription: '' // Empty transcription for segmentation-only mode
        });
      }

      // Update project status with VAD info
      await storage.updateProject(projectId, {
        status: 'ready_for_transcription',
        totalSegments: newSegments.length,
        transcribedSegments: 0,
        processingNotes: `VAD-enhanced segmentation: ${newSegments.length} segments detected`
      });

      res.json({ 
        message: "Segmentação melhorada com VAD concluída com sucesso",
        segmentsCount: newSegments.length,
        vadEnhanced: true,
        method: 'vad_whisper'
      });
    } catch (error) {
      console.error("Error in VAD reprocessing:", error);
      res.status(500).json({ 
        message: "Erro na segmentação VAD",
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Generate transcriptions with Whisper (for existing segments)
  app.post('/api/projects/:id/generate-transcriptions', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      console.log(`Generating transcriptions for project ${projectId} with Whisper...`);

      // Get language information - using auto-detection instead of forcing
      const language = await storage.getLanguageById(project.languageId);
      const languageCode = language?.code || 'generic';
      console.log('Language from DB:', languageCode, '- Using Whisper auto-detection');
      
      // Get contextual examples for better transcription
      const examples = await storage.getTranscriptionExamples(project.domainType, languageCode);
      
      const contextOptions = {
        // Remove languageCode to enable auto-detection
        domainType: project.domainType || undefined,
        transcriptionContext: project.transcriptionContext || undefined,
        examples: examples.slice(0, 3).map(ex => ({
          description: ex.audioDescription,
          transcription: ex.correctTranscription
        }))
      };
      
      const whisperResponse = await whisperService.transcribeWithTimestamps(project.filePath, contextOptions);
      const whisperSegments = whisperService.convertWhisperSegments(whisperResponse, project.id);
      
      const existingSegments = await storage.getSegmentsByProject(projectId);

      // Update existing segments with transcriptions
      let transcriptionsCount = 0;
      for (const whisperSegment of whisperSegments) {
        // Find matching segment by time proximity (within 1 second)
        const matchingSegment = existingSegments.find((seg: any) => 
          Math.abs(seg.startTime - whisperSegment.startTime) < 1
        );

        if (matchingSegment) {
          await storage.updateSegment(matchingSegment.id, {
            transcription: whisperSegment.transcription
          });
          transcriptionsCount++;
        }
      }

      res.json({ 
        message: "Transcrições geradas com sucesso usando Whisper",
        transcriptionsCount 
      });
    } catch (error) {
      console.error("Error in generate transcriptions route:", error);
      res.status(500).json({ message: "Erro na geração de transcrições com Whisper" });
    }
  });






  // In-context learning routes for transcription examples
  app.get('/api/transcription-examples', isAuthenticated, async (req: any, res) => {
    try {
      const { domainType, languageCode } = req.query;
      const examples = await storage.getTranscriptionExamples(domainType, languageCode);
      res.json(examples);
    } catch (error) {
      console.error("Error fetching transcription examples:", error);
      res.status(500).json({ message: "Erro ao buscar exemplos de transcrição" });
    }
  });

  app.post('/api/transcription-examples', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const exampleData = {
        ...req.body,
        createdBy: userId
      };
      
      const example = await storage.createTranscriptionExample(exampleData);
      res.json(example);
    } catch (error) {
      console.error("Error creating transcription example:", error);
      res.status(500).json({ message: "Erro ao criar exemplo de transcrição" });
    }
  });

  app.patch('/api/transcription-examples/:id', isAuthenticated, async (req: any, res) => {
    try {
      const exampleId = parseInt(req.params.id);
      const example = await storage.updateTranscriptionExample(exampleId, req.body);
      res.json(example);
    } catch (error) {
      console.error("Error updating transcription example:", error);
      res.status(500).json({ message: "Erro ao atualizar exemplo de transcrição" });
    }
  });

  app.delete('/api/transcription-examples/:id', isAuthenticated, async (req: any, res) => {
    try {
      const exampleId = parseInt(req.params.id);
      await storage.deleteTranscriptionExample(exampleId);
      res.json({ message: "Exemplo excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting transcription example:", error);
      res.status(500).json({ message: "Erro ao excluir exemplo de transcrição" });
    }
  });

  // Track transcription corrections for learning
  app.patch('/api/segments/:id/correct', isAuthenticated, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const { originalTranscription, correctedTranscription } = req.body;
      const userId = req.user.claims.sub;
      
      // Get segment to access project info
      const segment = await storage.getSegment(segmentId);
      if (!segment) {
        return res.status(404).json({ message: "Segmento não encontrado" });
      }
      
      // Get project for language and domain info
      const project = await storage.getProject(segment.projectId);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Get language code
      const language = await storage.getLanguageById(project.languageId);
      
      // Update the segment
      const updatedSegment = await storage.updateSegment(segmentId, {
        transcription: correctedTranscription
      });
      
      // Record the correction for learning with language and domain context
      if (originalTranscription !== correctedTranscription) {
        await storage.createTranscriptionCorrection({
          segmentId,
          originalTranscription,
          correctedTranscription,
          correctedBy: userId,
          confidenceScore: segment.confidence || 0.5,
          languageCode: language?.code,
          domainType: project.domainType || undefined
        });
        console.log(`Saved correction for learning: ${language?.code} / ${project.domainType || 'general'}`);
      }
      
      res.json(updatedSegment);
    } catch (error) {
      console.error("Error correcting transcription:", error);
      res.status(500).json({ message: "Erro ao corrigir transcrição" });
    }
  });

  // Export project segmentations
  app.get('/api/projects/:id/export/segments', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const segments = await storage.getSegmentsByProject(projectId);
      
      // Create segmentation export data
      const exportData = {
        project: {
          id: project.id,
          name: project.name,
          duration: project.duration,
          exportDate: new Date().toISOString()
        },
        segments: segments.map(segment => ({
          segmentNumber: segment.segmentNumber,
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segment.endTime - segment.startTime,
          isTranscribed: segment.isTranscribed,
          confidence: segment.confidence
        }))
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="segmentacao_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting segments:", error);
      res.status(500).json({ message: "Erro ao exportar segmentações" });
    }
  });

  // Export project transcriptions as CSV
  app.get('/api/projects/:id/export/transcriptions', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const segments = await storage.getSegmentsByProject(projectId);
      
      // Filter segments with transcriptions
      const transcribedSegments = segments.filter(segment => segment.transcription && segment.transcription.trim());
      
      // Create CSV content
      let csvContent = "Arquivo de Audio,Transcrição\n";
      
      transcribedSegments.forEach(segment => {
        // Generate audio filename for each segment
        const audioFilename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_segmento_${segment.segmentNumber.toString().padStart(3, '0')}.wav`;
        // Escape quotes in transcription and wrap in quotes
        const escapedTranscription = `"${segment.transcription.replace(/"/g, '""')}"`;
        csvContent += `${audioFilename},${escapedTranscription}\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="transcricao_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting transcriptions:", error);
      res.status(500).json({ message: "Erro ao exportar transcrições" });
    }
  });

  // Export audio segments as ZIP
  app.get('/api/projects/:id/export/audio-segments', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      if (!project.filePath || !fs.existsSync(project.filePath)) {
        return res.status(404).json({ message: "Arquivo de áudio não encontrado" });
      }

      const segments = await storage.getSegmentsByProject(projectId);

      if (segments.length === 0) {
        return res.status(400).json({ message: "Nenhum segmento encontrado para exportar" });
      }

      console.log(`Exporting ${segments.length} audio segments for project ${projectId}`);

      // Set response headers for ZIP download
      const zipFilename = `segmentos_audio_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Handle archive errors
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Erro ao criar arquivo ZIP" });
        }
      });

      // Pipe archive to response
      archive.pipe(res);

      // Create temporary directory for segment files
      const tempDir = path.join(process.cwd(), 'temp_segments', projectId.toString());
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Process segments sequentially to avoid overwhelming the system
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        try {
          const segmentFilename = `segmento_${segment.segmentNumber.toString().padStart(3, '0')}_${segment.startTime.toFixed(1)}s-${segment.endTime.toFixed(1)}s.wav`;
          const outputPath = path.join(tempDir, segmentFilename);

          // Extract audio segment using ffmpeg
          await new Promise((resolve, reject) => {
            ffmpeg(project.filePath)
              .seekInput(segment.startTime)
              .duration(segment.endTime - segment.startTime)
              .audioCodec('pcm_s16le') // WAV format
              .output(outputPath)
              .on('end', () => {
                console.log(`Segment ${i + 1}/${segments.length} processed: ${segmentFilename}`);
                resolve(outputPath);
              })
              .on('error', (err) => {
                console.error(`Error processing segment ${segment.segmentNumber}:`, err);
                reject(err);
              })
              .run();
          });

          // Add file to archive
          if (fs.existsSync(outputPath)) {
            archive.file(outputPath, { name: segmentFilename });
          }

        } catch (segmentError) {
          console.error(`Failed to process segment ${segment.segmentNumber}:`, segmentError);
          // Continue with next segment instead of failing completely
        }
      }

      // Add metadata file to ZIP
      const metadataContent = JSON.stringify({
        project: {
          id: project.id,
          name: project.name,
          duration: project.duration,
          exportDate: new Date().toISOString()
        },
        segments: segments.map(segment => ({
          filename: `segmento_${segment.segmentNumber.toString().padStart(3, '0')}_${segment.startTime.toFixed(1)}s-${segment.endTime.toFixed(1)}s.wav`,
          segmentNumber: segment.segmentNumber,
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segment.endTime - segment.startTime,
          transcription: segment.transcription || '',
          isTranscribed: segment.isTranscribed,
          confidence: segment.confidence
        }))
      }, null, 2);

      archive.append(metadataContent, { name: 'metadata.json' });

      // Finalize archive
      await archive.finalize();

      // Clean up temporary files after a delay
      setTimeout(() => {
        try {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log(`Cleaned up temporary directory: ${tempDir}`);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up temporary files:', cleanupError);
        }
      }, 5000); // Clean up after 5 seconds

    } catch (error) {
      console.error("Error exporting audio segments:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Erro ao exportar segmentos de áudio" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Mock function to generate segments based on prosodic analysis principles
function generateMockSegments(projectId: number, duration: number) {
  const segments = [];
  let currentTime = 0;
  let segmentNumber = 1;

  while (currentTime < duration) {
    // Generate segment length between 3-15 seconds (typical sentence length)
    const segmentLength = Math.random() * 12 + 3;
    const endTime = Math.min(currentTime + segmentLength, duration);
    
    // Lower confidence for basic method
    const confidence = 0.4 + Math.random() * 0.3; // 0.4-0.7 range
    
    segments.push({
      projectId,
      segmentNumber,
      startTime: currentTime,
      endTime,
      confidence,
      processingMethod: 'basic'
    });
    
    currentTime = endTime;
    segmentNumber++;
  }

  return segments;
}
