import {
  users,
  languages,
  userLanguages,
  userProjects,
  folders,
  projects,
  segments,
  processingQueue,
  transcriptionExamples,
  transcriptionCorrections,
  type User,
  type UpsertUser,
  type Language,
  type InsertLanguage,
  type Project,
  type InsertProject,
  type Segment,
  type InsertSegment,
  type UpdateSegment,
  type UserLanguage,
  type InsertUserLanguage,
  type UserProject,
  type InsertUserProject,
  type Folder,
  type InsertFolder,
  type ProcessingQueueItem,
  type TranscriptionExample,
  type TranscriptionCorrection,
  type InsertTranscriptionExample,
  type InsertTranscriptionCorrection,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: "manager" | "editor"): Promise<User>;
  
  // Language operations
  getLanguages(): Promise<Language[]>;
  getLanguageById(id: number): Promise<Language | undefined>;
  createLanguage(language: InsertLanguage): Promise<Language>;
  updateLanguage(id: number, language: Partial<InsertLanguage>): Promise<Language>;
  
  // User language assignments
  getUserLanguages(userId: string): Promise<Array<UserLanguage & { languageName: string; languageCode: string }>>;
  assignUserLanguage(assignment: InsertUserLanguage): Promise<UserLanguage>;
  removeUserLanguage(userId: string, languageId: number): Promise<void>;
  
  // Project operations
  getProjects(userId?: string, languageIds?: number[]): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  
  // Segment operations
  getSegments(projectId: number): Promise<Segment[]>;
  getProjectSegments(projectId: number): Promise<Segment[]>;
  getSegmentsByProject(projectId: number): Promise<Segment[]>;
  getSegment(id: number): Promise<Segment | undefined>;
  createSegment(segment: InsertSegment): Promise<Segment>;
  updateSegment(id: number, segment: UpdateSegment): Promise<Segment>;
  deleteProjectSegments(projectId: number): Promise<void>;
  
  // Dashboard statistics
  getDashboardStats(userId?: string, languageIds?: number[]): Promise<{
    activeProjects: number;
    processedHours: number;
    validatedSegments: number;
    accuracyRate: number;
  }>;
  
  // Processing queue operations
  addToProcessingQueue(projectId: number): Promise<ProcessingQueueItem>;
  getProcessingQueue(): Promise<ProcessingQueueItem[]>;
  updateProcessingStatus(id: number, status: string, errorMessage?: string): Promise<void>;

  // Transcription learning operations
  getTranscriptionExamples(domainType?: string, languageCode?: string): Promise<TranscriptionExample[]>;
  createTranscriptionExample(example: InsertTranscriptionExample): Promise<TranscriptionExample>;
  updateTranscriptionExample(id: number, updates: Partial<InsertTranscriptionExample>): Promise<TranscriptionExample>;
  deleteTranscriptionExample(id: number): Promise<void>;

  createTranscriptionCorrection(correction: InsertTranscriptionCorrection): Promise<TranscriptionCorrection>;

  // User management operations
  getAllUsers(): Promise<User[]>;
  updateUserStatus(userId: string, isActive: boolean): Promise<User>;
  
  // Additional segment operations
  getSegmentById(id: number): Promise<Segment | undefined>;
  getProjectById(id: number): Promise<Project | undefined>;

  // Transcription corrections operations (automatic learning from user corrections)
  saveTranscriptionCorrection(correction: InsertTranscriptionCorrection): Promise<TranscriptionCorrection>;
  getTranscriptionCorrections(): Promise<TranscriptionCorrection[]>;
  getTranscriptionCorrectionsByLanguage(languageCode: string): Promise<TranscriptionCorrection[]>;

  // User-Project assignment operations
  assignUserToProject(assignment: InsertUserProject): Promise<UserProject>;
  removeUserFromProject(userId: string, projectId: number): Promise<void>;
  getUserProjects(userId: string): Promise<number[]>;
  checkUserProjectAccess(userId: string, projectId: number): Promise<boolean>;

  // Folder operations
  getFolders(projectId: number): Promise<Folder[]>;
  getFolder(id: number): Promise<Folder | undefined>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  updateFolder(id: number, folder: Partial<InsertFolder>): Promise<Folder>;
  deleteFolder(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User management methods for managers
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUserRole(userId: string, role: 'manager' | 'editor'): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }



  // Language operations
  async getLanguages(): Promise<Language[]> {
    return await db.select().from(languages).where(eq(languages.isActive, true)).orderBy(asc(languages.name));
  }

  async getLanguageById(id: number): Promise<Language | undefined> {
    const [language] = await db.select().from(languages).where(eq(languages.id, id));
    return language;
  }

  async getSegmentsByProject(projectId: number): Promise<Segment[]> {
    return await db.select().from(segments).where(eq(segments.projectId, projectId)).orderBy(asc(segments.segmentNumber));
  }

  async createLanguage(language: InsertLanguage): Promise<Language> {
    const [newLanguage] = await db.insert(languages).values(language).returning();
    return newLanguage;
  }

  async updateLanguage(id: number, language: Partial<InsertLanguage>): Promise<Language> {
    const [updatedLanguage] = await db
      .update(languages)
      .set(language)
      .where(eq(languages.id, id))
      .returning();
    return updatedLanguage;
  }

  // User language assignments
  async getUserLanguages(userId: string): Promise<Array<UserLanguage & { languageName: string; languageCode: string }>> {
    return await db
      .select({
        id: userLanguages.id,
        userId: userLanguages.userId,
        languageId: userLanguages.languageId,
        createdAt: userLanguages.createdAt,
        languageName: languages.name,
        languageCode: languages.code,
      })
      .from(userLanguages)
      .innerJoin(languages, eq(userLanguages.languageId, languages.id))
      .where(eq(userLanguages.userId, userId));
  }

  async assignUserLanguage(assignment: InsertUserLanguage): Promise<UserLanguage> {
    const [newAssignment] = await db.insert(userLanguages).values(assignment).returning();
    return newAssignment;
  }

  async removeUserLanguage(userId: string, languageId: number): Promise<void> {
    await db
      .delete(userLanguages)
      .where(and(
        eq(userLanguages.userId, userId),
        eq(userLanguages.languageId, languageId)
      ));
  }

  // Project operations
  async getProjects(userId?: string, languageIds?: number[]): Promise<Project[]> {
    const conditions = [];
    if (userId) {
      conditions.push(eq(projects.userId, userId));
    }
    if (languageIds && languageIds.length > 0) {
      conditions.push(inArray(projects.languageId, languageIds));
    }
    
    if (conditions.length > 0) {
      return await db
        .select()
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.createdAt));
    }
    
    return await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    // Delete from processing queue first to handle foreign key constraints
    await db.delete(processingQueue).where(eq(processingQueue.projectId, id));
    // Then delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Segment operations
  async getSegments(projectId: number): Promise<Segment[]> {
    return await db
      .select()
      .from(segments)
      .where(eq(segments.projectId, projectId))
      .orderBy(asc(segments.segmentNumber));
  }

  async deleteAllSegments(projectId: number): Promise<void> {
    await db.delete(segments).where(eq(segments.projectId, projectId));
  }

  async getProjectSegments(projectId: number): Promise<Segment[]> {
    return this.getSegments(projectId);
  }

  async getSegment(id: number): Promise<Segment | undefined> {
    const [segment] = await db.select().from(segments).where(eq(segments.id, id));
    return segment;
  }

  async createSegment(segment: InsertSegment): Promise<Segment> {
    const [newSegment] = await db.insert(segments).values(segment).returning();
    return newSegment;
  }

  async updateSegment(id: number, segment: UpdateSegment): Promise<Segment> {
    const [updatedSegment] = await db
      .update(segments)
      .set({ ...segment, updatedAt: new Date() })
      .where(eq(segments.id, id))
      .returning();
    return updatedSegment;
  }

  async deleteProjectSegments(projectId: number): Promise<void> {
    await db.delete(segments).where(eq(segments.projectId, projectId));
  }

  // Dashboard statistics
  async getDashboardStats(userId?: string, languageIds?: number[]): Promise<{
    activeProjects: number;
    processedHours: number;
    validatedSegments: number;
    accuracyRate: number;
  }> {
    const conditions = [];
    if (userId) {
      conditions.push(eq(projects.userId, userId));
    }
    if (languageIds && languageIds.length > 0) {
      conditions.push(inArray(projects.languageId, languageIds));
    }

    const [activeProjectsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(
        and(
          inArray(projects.status, ["processing", "ready_for_validation", "in_validation"]),
          ...(conditions.length > 0 ? conditions : [])
        )
      );

    const [processedHoursResult] = await db
      .select({ total: sql<number>`sum(duration) / 3600.0` })
      .from(projects)
      .where(
        and(
          eq(projects.status, "completed"),
          ...(conditions.length > 0 ? conditions : [])
        )
      );

    const [validatedSegmentsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(segments)
      .innerJoin(projects, eq(segments.projectId, projects.id))
      .where(
        and(
          eq(segments.isValidated, true),
          ...(conditions.length > 0 ? conditions : [])
        )
      );

    const [accuracyResult] = await db
      .select({ avgFScore: sql<number>`avg(boundary_f_score)` })
      .from(projects)
      .where(
        and(
          sql`boundary_f_score IS NOT NULL`,
          ...(conditions.length > 0 ? conditions : [])
        )
      );

    return {
      activeProjects: activeProjectsResult.count || 0,
      processedHours: Math.round(processedHoursResult.total || 0),
      validatedSegments: validatedSegmentsResult.count || 0,
      accuracyRate: Math.round((accuracyResult.avgFScore || 0) * 100 * 10) / 10,
    };
  }

  // Processing queue operations
  async addToProcessingQueue(projectId: number): Promise<ProcessingQueueItem> {
    const [queueItem] = await db
      .insert(processingQueue)
      .values({ projectId })
      .returning();
    return queueItem;
  }

  async getProcessingQueue(): Promise<ProcessingQueueItem[]> {
    return await db
      .select()
      .from(processingQueue)
      .where(inArray(processingQueue.status, ["pending", "processing"]))
      .orderBy(asc(processingQueue.createdAt));
  }

  async updateProcessingStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(processingQueue)
      .set({ 
        status: status as any, 
        errorMessage, 
        updatedAt: new Date() 
      })
      .where(eq(processingQueue.id, id));
  }

  // Transcription examples for in-context learning
  async getTranscriptionExamples(domainType?: string, languageCode?: string): Promise<TranscriptionExample[]> {
    const conditions = [eq(transcriptionExamples.isActive, true)];
    
    if (domainType) {
      conditions.push(eq(transcriptionExamples.domainType, domainType));
    }
    
    if (languageCode) {
      conditions.push(eq(transcriptionExamples.languageCode, languageCode));
    }
    
    return await db
      .select()
      .from(transcriptionExamples)
      .where(and(...conditions))
      .orderBy(transcriptionExamples.createdAt);
  }

  async createTranscriptionExample(data: InsertTranscriptionExample): Promise<TranscriptionExample> {
    const [example] = await db.insert(transcriptionExamples).values(data).returning();
    return example;
  }

  async updateTranscriptionExample(id: number, data: Partial<InsertTranscriptionExample>): Promise<TranscriptionExample> {
    const [example] = await db.update(transcriptionExamples)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(transcriptionExamples.id, id))
      .returning();
    return example;
  }

  async deleteTranscriptionExample(id: number): Promise<void> {
    await db.delete(transcriptionExamples).where(eq(transcriptionExamples.id, id));
  }

  // Transcription corrections for learning
  async createTranscriptionCorrection(data: InsertTranscriptionCorrection): Promise<TranscriptionCorrection> {
    const [correction] = await db.insert(transcriptionCorrections).values(data).returning();
    return correction;
  }

  async getTranscriptionCorrections(domainType?: string, languageCode?: string): Promise<TranscriptionCorrection[]> {
    const conditions = [];
    
    if (domainType) {
      conditions.push(eq(transcriptionCorrections.domainType, domainType));
    }
    
    if (languageCode) {
      conditions.push(eq(transcriptionCorrections.languageCode, languageCode));
    }
    
    if (conditions.length > 0) {
      return await db
        .select()
        .from(transcriptionCorrections)
        .where(and(...conditions))
        .orderBy(transcriptionCorrections.createdAt);
    }
    
    return await db
      .select()
      .from(transcriptionCorrections)
      .orderBy(transcriptionCorrections.createdAt);
  }

  // Additional segment operations for contextual learning
  async getSegmentById(id: number): Promise<Segment | undefined> {
    const [segment] = await db.select().from(segments).where(eq(segments.id, id));
    return segment;
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  // Contextual learning operations (automatic from user corrections)
  async saveTranscriptionCorrection(correction: InsertTranscriptionCorrection): Promise<TranscriptionCorrection> {
    const [newCorrection] = await db
      .insert(transcriptionCorrections)
      .values(correction)
      .returning();
    return newCorrection;
  }

  async getTranscriptionCorrectionsByLanguage(languageCode: string): Promise<TranscriptionCorrection[]> {
    return await db
      .select()
      .from(transcriptionCorrections)
      .where(eq(transcriptionCorrections.languageCode, languageCode))
      .orderBy(desc(transcriptionCorrections.createdAt));
  }

  // User-Project assignment operations
  async assignUserToProject(assignment: InsertUserProject): Promise<UserProject> {
    const [userProject] = await db
      .insert(userProjects)
      .values(assignment)
      .returning();
    return userProject;
  }

  async removeUserFromProject(userId: string, projectId: number): Promise<void> {
    await db
      .delete(userProjects)
      .where(
        and(
          eq(userProjects.userId, userId),
          eq(userProjects.projectId, projectId)
        )
      );
  }

  async getUserProjects(userId: string): Promise<number[]> {
    const assignments = await db
      .select({ projectId: userProjects.projectId })
      .from(userProjects)
      .where(eq(userProjects.userId, userId));
    return assignments.map(a => a.projectId);
  }

  async checkUserProjectAccess(userId: string, projectId: number): Promise<boolean> {
    const [assignment] = await db
      .select()
      .from(userProjects)
      .where(
        and(
          eq(userProjects.userId, userId),
          eq(userProjects.projectId, projectId)
        )
      )
      .limit(1);
    return !!assignment;
  }

  // Folder operations
  async getFolders(projectId: number): Promise<Folder[]> {
    return await db
      .select()
      .from(folders)
      .where(eq(folders.projectId, projectId))
      .orderBy(asc(folders.createdAt));
  }

  async getFolder(id: number): Promise<Folder | undefined> {
    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, id));
    return folder;
  }

  async createFolder(folder: InsertFolder): Promise<Folder> {
    const [newFolder] = await db
      .insert(folders)
      .values(folder)
      .returning();
    return newFolder;
  }

  async updateFolder(id: number, data: Partial<InsertFolder>): Promise<Folder> {
    const [folder] = await db
      .update(folders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();
    return folder;
  }

  async deleteFolder(id: number): Promise<void> {
    await db.delete(folders).where(eq(folders.id, id));
  }
}

export const storage = new DatabaseStorage();
