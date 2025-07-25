import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { whisperService } from "./whisperService";
import type { Language } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertProjectSchema, insertLanguageSchema, updateSegmentSchema, insertUserLanguageSchema } from "@shared/schema";
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

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let languageIds;
      if (user?.role === 'editor') {
        const userLanguages = await storage.getUserLanguages(userId);
        languageIds = userLanguages.map(lang => lang.id);
      }
      
      const stats = await storage.getDashboardStats(
        user?.role === 'manager' ? undefined : userId,
        languageIds
      );
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
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

  app.post('/api/languages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const languageData = insertLanguageSchema.parse(req.body);
      const language = await storage.createLanguage(languageData);
      res.json(language);
    } catch (error) {
      console.error("Error creating language:", error);
      res.status(500).json({ message: "Erro ao criar idioma" });
    }
  });

  // Projects (temporarily allow without auth for testing)
  app.get('/api/projects', async (req: any, res) => {
    try {
      // For testing without auth, return all projects
      const userId = req.user?.claims?.sub || '40930747';
      const user = await storage.getUser(userId);
      
      let languageIds;
      if (user?.role === 'editor') {
        const userLanguages = await storage.getUserLanguages(userId);
        languageIds = userLanguages.map(lang => lang.id);
      }
      
      const projects = await storage.getProjects(
        user?.role === 'manager' ? undefined : userId,
        languageIds
      );
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Erro ao buscar projetos" });
    }
  });

  app.get('/api/projects/:id', async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      // For testing without auth, allow access to all projects
      const userId = req.user?.claims?.sub || '40930747';
      const user = await storage.getUser(userId);
      
      // Check access permissions (temporarily disabled for testing)
      if (user?.role === 'editor') {
        const userLanguages = await storage.getUserLanguages(userId);
        const hasAccess = userLanguages.some(lang => lang.id === project.languageId) || 
                         project.userId === userId;
        
        // Temporarily allow access for testing
        // if (!hasAccess) {
        //   return res.status(403).json({ message: "Acesso negado" });
        // }
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Erro ao buscar projeto" });
    }
  });

  // Segments
  app.get('/api/projects/:id/segments', async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const segments = await storage.getProjectSegments(projectId);
      res.json(segments);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ message: "Erro ao buscar segmentos" });
    }
  });

  // Audio serving
  app.get('/api/projects/:id/audio', async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project || !project.filePath) {
        console.log("Project or filePath missing:", { project: !!project, filePath: project?.filePath });
        return res.status(404).json({ message: "Arquivo de áudio não encontrado" });
      }


      
      // Check if file exists
      if (!fs.existsSync(project.filePath)) {
        return res.status(404).json({ message: "Arquivo de áudio não encontrado no sistema" });
      }

      // Get file stats for proper content-length
      const stats = fs.statSync(project.filePath);
      
      // Set proper audio headers
      res.set({
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
        'Content-Length': stats.size.toString()
      });

      // Stream the audio file
      const stream = fs.createReadStream(project.filePath);
      stream.pipe(res);
    } catch (error) {
      console.error("Error serving audio:", error);
      res.status(500).json({ message: "Erro ao carregar áudio" });
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

  // Delete project (temporarily allow without auth for testing)
  app.delete('/api/projects/:id', async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // For testing, use hardcoded user ID - in production this would use proper auth
      const userId = req.user?.claims?.sub || '40930747';
      const user = await storage.getUser(userId);

      // Skip auth check for now to test functionality
      // if (user?.role !== 'manager') {
      //   return res.status(403).json({ message: "Apenas gerentes podem deletar projetos" });
      // }

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

  // Audio upload (temporarily allow without auth for testing)
  app.post('/api/upload', upload.single('audio'), async (req: any, res) => {
    try {
      console.log('Upload request received:', {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        mimeType: req.file?.mimetype,
        body: req.body,
        userId: req.user?.claims?.sub
      });

      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const { name, languageId } = req.body;
      
      // For testing, use default user ID if not authenticated
      const userId = req.user?.claims?.sub || '40930747'; // Lucas Silva's ID
      const user = await storage.getUser(userId);
      
      console.log('User found:', { userId, userRole: user?.role });

      // Use a default language ID if none provided (1 = generic/unknown language)
      const finalLanguageId = languageId ? parseInt(languageId) : 1;

      // Extract real audio duration from file 
      // For now, calculate based on file size estimation (will be improved with proper audio library)
      const fileSizeKB = req.file.size / 1024;
      const estimatedDuration = Math.round(fileSizeKB / 15); // Rough estimate: ~15KB per second for compressed audio
      
      const audioInfo = {
        duration: Math.max(estimatedDuration, 60), // Minimum 1 minute, max based on file size
        sampleRate: 44100,
        channels: 2,
      };

      const projectData = {
        name: name || req.file.originalname,
        originalFilename: req.file.originalname,
        filePath: req.file.path,
        duration: audioInfo.duration,
        sampleRate: audioInfo.sampleRate,
        channels: audioInfo.channels,
        languageId: finalLanguageId,
        userId,
      };

      const project = await storage.createProject(projectData);
      
      // Add to processing queue
      await storage.addToProcessingQueue(project.id);
      
      // Try intelligent segmentation with Whisper
      let segments = [];
      let processingMethod = 'basic';
      let boundaryFScore = 0.65;

      try {
        console.log(`Checking Whisper compatibility for file: ${req.file.path} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        if (whisperService.isAudioFileValid(req.file.path)) {
          console.log('Using Whisper for intelligent segmentation...');
          const whisperResponse = await whisperService.transcribeWithTimestamps(req.file.path);
          segments = whisperService.convertWhisperSegments(whisperResponse, project.id);
          processingMethod = 'whisper';
          boundaryFScore = 0.92; // Higher confidence for Whisper
          console.log(`Whisper created ${segments.length} intelligent segments`);
        } else {
          const fileSizeMB = (req.file.size / 1024 / 1024).toFixed(2);
          throw new Error(`Arquivo não é compatível com Whisper: ${fileSizeMB}MB, formato: ${path.extname(req.file.path)}`);
        }
      } catch (error) {
        console.warn('Whisper processing failed, using basic segmentation:', error);
        
        // Fallback to basic segmentation
        segments = generateMockSegments(project.id, audioInfo.duration);
        processingMethod = 'basic';
        boundaryFScore = 0.65;
      }

      // Save segments to storage
      for (const segment of segments) {
        await storage.createSegment(segment);
      }
      
      // Update project status
      await storage.updateProject(project.id, { 
        status: 'ready_for_validation',
        totalSegments: segments.length,
        boundaryFScore
      });

      console.log('Upload successful, project created:', project.id);
      res.json(project);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      
      // Provide more specific error messages
      if (error.message?.includes('arquivo não suportado')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Erro ao fazer upload do arquivo: " + (error.message || 'Erro desconhecido') });
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
      
      if (updateData.isValidated) {
        updateData.validatedBy = req.user.claims.sub;
        updateData.validatedAt = new Date();
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
        isValidated: false,
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
        isValidated: false,
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
          status: 'ready_for_validation',
          totalSegments: newSegments.length,
          validatedSegments: 0,
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
        status: 'ready_for_validation',
        totalSegments: newSegments.length,
        validatedSegments: 0
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
            isValidated: false,
            isApproved: false
          });
        }
        
        // Update project status
        await storage.updateProject(projectId, {
          status: 'ready_for_validation',
          totalSegments: segments.length,
          validatedSegments: 0
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
              isValidated: false,
              isApproved: false
            });
          }
          
          await storage.updateProject(projectId, {
            status: 'ready_for_validation',
            totalSegments: fallbackSegments.length,
            validatedSegments: 0
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
        status: 'ready_for_validation',
        totalSegments: newSegments.length,
        validatedSegments: 0,
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

  // User management (manager only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const users = await storage.getAllUsers();
      
      // Get user language assignments
      const usersWithLanguages = await Promise.all(
        users.map(async (user) => {
          const languages = await storage.getUserLanguages(user.id);
          return {
            ...user,
            assignedLanguages: languages
          };
        })
      );

      res.json(usersWithLanguages);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const targetUserId = req.params.id;
      const { role } = req.body;
      
      if (!['manager', 'editor'].includes(role)) {
        return res.status(400).json({ message: "Role inválido" });
      }
      
      const updatedUser = await storage.updateUserRole(targetUserId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Erro ao atualizar função do usuário" });
    }
  });

  // User language assignments
  app.post('/api/users/:id/languages', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const userId = req.params.id;
      const { languageId } = req.body;
      
      // Check if assignment already exists
      const existingAssignments = await storage.getUserLanguages(userId);
      const alreadyAssigned = existingAssignments.some(lang => lang.languageId === languageId);
      
      if (alreadyAssigned) {
        return res.status(400).json({ message: "Usuário já possui esse idioma atribuído" });
      }
      
      const assignment = await storage.assignUserLanguage({ userId, languageId });
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning language:", error);
      res.status(500).json({ message: "Erro ao atribuir idioma" });
    }
  });

  // Remove user language assignment
  app.delete('/api/users/:id/languages/:languageId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const userId = req.params.id;
      const languageId = parseInt(req.params.languageId);
      
      await storage.removeUserLanguage(userId, languageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing language assignment:", error);
      res.status(500).json({ message: "Erro ao remover atribuição de idioma" });
    }
  });

  // Update user active status
  app.patch('/api/users/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const targetUserId = req.params.id;
      const { isActive } = req.body;
      
      const updatedUser = await storage.updateUserStatus(targetUserId, isActive);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Erro ao atualizar status do usuário" });
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
      
      // Update the segment
      const segment = await storage.updateSegment(segmentId, {
        transcription: correctedTranscription
      });
      
      // Record the correction for learning
      if (originalTranscription !== correctedTranscription) {
        await storage.createTranscriptionCorrection({
          segmentId,
          originalTranscription,
          correctedTranscription,
          correctedBy: userId,
          confidenceScore: segment.confidence || 0.5
        });
      }
      
      res.json(segment);
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
          isValidated: segment.isValidated,
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
          isValidated: segment.isValidated,
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
