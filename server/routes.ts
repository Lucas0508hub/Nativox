import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import ffmpeg from "fluent-ffmpeg";
import { storage } from "./storage";
import { upload, uploadDir } from "./config/multer";
import authRoutes from "./routes-auth";
import { authenticateToken, requireAuth } from "./middleware/auth";
import { API_MESSAGES, HTTP_STATUS, USER_ROLES } from "./constants";
import type { Language } from "@shared/schema";
import { insertProjectSchema, updateSegmentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRoutes);

  app.get('/api/test-auth', authenticateToken, (req: any, res) => {
    res.json({
      isAuthenticated: true,
      user: req.user,
      message: "Authentication successful"
    });
  });

  app.get('/api/auth/user', authenticateToken, async (req: any, res) => {
    try {
      const user = req.user;
      const userLanguages = user.role === 'editor' 
        ? await storage.getUserLanguages(user.id)
        : [];
      res.json({ ...user, userLanguages });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });

  app.get('/api/languages', async (req, res) => {
    try {
      const languages = await storage.getLanguages();
      res.json(languages);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ message: "Erro ao buscar idiomas" });
    }
  });


  // Get single segment
  app.get('/api/segments/:id', authenticateToken, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const segment = await storage.getSegment(segmentId);
      
      if (!segment) {
        return res.status(404).json({ message: "Segmento não encontrado" });
      }
      
      // Verify user has access to the segment's project
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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
  app.patch('/api/segments/:id', authenticateToken, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const userId = req.user.id;
      const updateData = req.body;
      
      // Get segment to verify access
      const existingSegment = await storage.getSegment(segmentId);
      if (!existingSegment) {
        return res.status(404).json({ message: "Segmento não encontrado" });
      }
      
      // Verify user has access to the segment's project
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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
  app.get('/api/projects', authenticateToken, async (req: any, res) => {
    try {
      const user = req.user;
      
      let projects;
      if (user?.role === 'admin' || user?.role === 'manager') {
        // Admins and managers see all projects
        projects = await storage.getProjects();
      } else {
        // Editors see only projects in their assigned languages
        const userLanguages = await storage.getUserLanguages(user.id);
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
  app.get('/api/projects/:id', authenticateToken, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Verify user has access to this project
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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

  // Update project
  app.patch('/api/projects/:id', authenticateToken, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user;
      const { name } = req.body;

      // Only admins and managers can update projects
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ message: "Apenas administradores e gerentes podem editar projetos" });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Nome do projeto é obrigatório" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const updatedProject = await storage.updateProject(projectId, { name: name.trim() });
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Erro ao atualizar projeto" });
    }
  });

  // Recalculate project statistics
  app.post('/api/projects/:id/recalculate-stats', authenticateToken, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user;

      // Only admins and managers can recalculate stats
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ message: "Apenas administradores e gerentes podem recalcular estatísticas" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const updatedProject = await storage.recalculateProjectStats(projectId);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error recalculating project stats:", error);
      res.status(500).json({ message: "Erro ao recalcular estatísticas do projeto" });
    }
  });

  // Serve segment audio with range support
  app.get('/api/segments/:id/audio', authenticateToken, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const segment = await storage.getSegment(segmentId);
      
      if (!segment || !segment.filePath) {
        return res.status(404).json({ message: "Arquivo de áudio do segmento não encontrado" });
      }
      
      // Verify user has access to the segment's project
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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

      // Get file stats
      const stats = fs.statSync(segment.filePath);
      const fileSize = stats.size;
      
      // Detect mime type from file extension
      const ext = path.extname(segment.filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
      };
      const mimeType = mimeTypes[ext] || 'audio/wav';
      
      // Handle range requests for streaming
      const range = req.headers.range;
      
      if (range) {
        // Parse range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        // Create read stream with range
        const stream = fs.createReadStream(segment.filePath, { start, end });
        
        // Set partial content headers
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
        });
        
        stream.pipe(res);
      } else {
        // No range request, send full file
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
        });
        
        const stream = fs.createReadStream(segment.filePath);
        stream.pipe(res);
      }
    } catch (error) {
      console.error("Error serving segment audio:", error);
      res.status(500).json({ message: "Erro ao carregar áudio do segmento" });
    }
  });


  // Update project
  app.patch("/api/projects/:id", authenticateToken, async (req, res) => {
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
  app.delete('/api/projects/:id', authenticateToken, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user;

      // Only admins and managers can delete projects
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ message: "Apenas administradores e gerentes podem deletar projetos" });
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
  app.get('/api/folders/:id', authenticateToken, async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const folder = await storage.getFolder(folderId);
      
      if (!folder) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      
      // Verify user has access to the folder's project
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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
  app.get('/api/projects/:projectId/folders', authenticateToken, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user.id;
      
      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Verify user has access to this project (either manager or assigned to project)
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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
  app.post('/api/projects/:projectId/folders', authenticateToken, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user.id;
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
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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
  app.put('/api/folders/:id', authenticateToken, async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const userId = req.user.id;
      const { name, description } = req.body;
      
      // Get folder to verify it exists and get its project
      const folder = await storage.getFolder(folderId);
      if (!folder) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      
      // Verify user has access to the folder's project
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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
  app.delete('/api/folders/:id', authenticateToken, async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Get folder to verify it exists and get its project
      const folder = await storage.getFolder(folderId);
      if (!folder) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      
      // Verify user has access to the folder's project
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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
  app.post('/api/folders/:folderId/upload-segments', authenticateToken, upload.array('audioFiles', 100), async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.folderId);
      const userId = req.user.id;
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
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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
            confidence: 0
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
  app.get('/api/folders/:folderId/segments', authenticateToken, async (req: any, res) => {
    try {
      const folderId = parseInt(req.params.folderId);
      const userId = req.user.id;
      
      // Get folder and verify access
      const folder = await storage.getFolder(folderId);
      if (!folder) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }
      
      // Verify user has access to the folder's project
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager') {
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
  app.post('/api/upload-batch', authenticateToken, upload.array('files', 100), async (req: any, res) => {
    try {
      const userId = req.user.id;
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
        const user = req.user;

        if (user?.role === 'admin' || user?.role === 'manager') {
          // Admins and managers can use any available language, default to first one
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
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'manager' && finalProjectId) {
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
      
      // Update project status and recalculate statistics
      if (finalProjectId) {
        await storage.updateProject(finalProjectId, {
          status: 'ready_for_transcription'
        });
        
        // Recalculate project statistics based on actual segments
        await storage.recalculateProjectStats(finalProjectId);
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
  app.get('/api/projects/:id/segments', authenticateToken, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const segments = await storage.getSegments(projectId);
      res.json(segments);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ message: "Erro ao buscar segmentos" });
    }
  });

  app.patch('/api/segments/:id', authenticateToken, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const updateData = updateSegmentSchema.parse(req.body);
      
      if (updateData.isTranscribed) {
        updateData.transcribedBy = req.user.id;
        updateData.transcribedAt = new Date();
      }
      
      const segment = await storage.updateSegment(segmentId, updateData);
      
      // Recalculate project statistics if transcription status changed
      if (updateData.isTranscribed !== undefined) {
        await storage.recalculateProjectStats(segment.projectId);
      }
      
      res.json(segment);
    } catch (error) {
      console.error("Error updating segment:", error);
      res.status(500).json({ message: "Erro ao atualizar segmento" });
    }
  });

  // Save transcription correction for contextual learning
  app.post("/api/segments/:id/corrections", authenticateToken, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const { originalTranscription, correctedTranscription } = req.body;
      const userId = req.user.id;

      // Get segment and project info for context
      const segment = await storage.getSegmentById(segmentId);
      if (!segment) {
        return res.status(404).json({ message: "Segment not found" });
      }

      const project = await storage.getProjectById(segment.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get language code from project's language
      const languages = await storage.getLanguages();
      const projectLanguage = languages.find(lang => lang.id === project.languageId);
      const languageCode = projectLanguage?.code || 'pt-BR';

      // Save the correction for learning
      const correction = await storage.saveTranscriptionCorrection({
        segmentId,
        originalTranscription,
        correctedTranscription,
        correctedBy: userId,
        domainType: project.domainType || 'general',
        languageCode
      });

      res.json({ message: "Correction saved for learning", correctionId: correction.id });
    } catch (error) {
      console.error("Error saving transcription correction:", error);
      res.status(500).json({ message: "Failed to save correction" });
    }
  });

  // Update segment boundary (for drag and drop)
  app.patch('/api/projects/:projectId/segments/:segmentId', authenticateToken, async (req: any, res) => {
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

  // Delete individual segment
  app.delete('/api/segments/:segmentId', authenticateToken, async (req: any, res) => {
    try {
      const { segmentId } = req.params;
      const user = req.user;

      // Only admins and managers can delete segments
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ message: "Apenas administradores e gerentes podem deletar segmentos" });
      }

      // Get segment to validate it exists
      const segment = await storage.getSegment(parseInt(segmentId));
      if (!segment) {
        return res.status(404).json({ error: "Segment not found" });
      }

      // Delete the segment
      await storage.deleteSegment(parseInt(segmentId));
      
      // Recalculate project statistics after deletion
      await storage.recalculateProjectStats(segment.projectId);
      
      res.json({ message: "Segmento removido com sucesso" });
    } catch (error) {
      console.error("Error deleting segment:", error);
      res.status(500).json({ error: "Failed to delete segment" });
    }
  });

  // Reorder segments in a folder
  app.patch('/api/folders/:folderId/reorder-segments', authenticateToken, async (req: any, res) => {
    try {
      const { folderId } = req.params;
      const { segmentIds } = req.body;
      const user = req.user;

      // Only admins and managers can reorder segments
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ message: "Apenas administradores e gerentes podem reordenar segmentos" });
      }

      if (!Array.isArray(segmentIds)) {
        return res.status(400).json({ error: "segmentIds must be an array" });
      }

      // Update segment numbers based on new order
      for (let i = 0; i < segmentIds.length; i++) {
        await storage.updateSegment(segmentIds[i], { segmentNumber: i + 1 });
      }
      
      res.json({ message: "Segmentos reordenados com sucesso" });
    } catch (error) {
      console.error("Error reordering segments:", error);
      res.status(500).json({ error: "Failed to reorder segments" });
    }
  });

  // Delete all segments (keep audio)
  app.delete('/api/projects/:id/segments/all', authenticateToken, async (req: any, res) => {
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

  // DEPRECATED: Create new segment - NOT USED in current manual workflow
  // This route is disabled to prevent foreign key violations (requires valid folderId)
  // Current workflow uses batch upload to folders: POST /api/folders/:folderId/segments/batch-upload
  /*
  app.post('/api/projects/:id/segments', authenticateToken, async (req: any, res) => {
    return res.status(410).json({ 
      error: "This endpoint is deprecated. Use batch upload to folders instead.",
      alternative: "POST /api/folders/:folderId/segments/batch-upload"
    });
  });
  */

  // DEPRECATED: Split segment - NOT USED in current manual workflow  
  // This route is disabled as the current workflow uses pre-segmented audio files
  /*
  app.post('/api/projects/:projectId/segments/split', authenticateToken, async (req: any, res) => {
    return res.status(410).json({ 
      error: "This endpoint is deprecated. Upload pre-segmented audio files instead.",
      alternative: "POST /api/folders/:folderId/segments/batch-upload"
    });
  });
  */











  // In-context learning routes for transcription examples
  app.get('/api/transcription-examples', authenticateToken, async (req: any, res) => {
    try {
      const { domainType, languageCode } = req.query;
      const examples = await storage.getTranscriptionExamples(domainType, languageCode);
      res.json(examples);
    } catch (error) {
      console.error("Error fetching transcription examples:", error);
      res.status(500).json({ message: "Erro ao buscar exemplos de transcrição" });
    }
  });

  app.post('/api/transcription-examples', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  app.patch('/api/transcription-examples/:id', authenticateToken, async (req: any, res) => {
    try {
      const exampleId = parseInt(req.params.id);
      const example = await storage.updateTranscriptionExample(exampleId, req.body);
      res.json(example);
    } catch (error) {
      console.error("Error updating transcription example:", error);
      res.status(500).json({ message: "Erro ao atualizar exemplo de transcrição" });
    }
  });

  app.delete('/api/transcription-examples/:id', authenticateToken, async (req: any, res) => {
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
  app.patch('/api/segments/:id/correct', authenticateToken, async (req: any, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const { originalTranscription, correctedTranscription } = req.body;
      const userId = req.user.id;
      
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
  app.get('/api/projects/:id/export/segments', authenticateToken, async (req: any, res) => {
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
  app.get('/api/projects/:id/export/transcriptions', authenticateToken, async (req: any, res) => {
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
        const escapedTranscription = `"${(segment.transcription || '').replace(/"/g, '""')}"`;
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
  app.get('/api/projects/:id/export/audio-segments', authenticateToken, async (req: any, res) => {
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
