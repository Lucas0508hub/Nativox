import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["manager", "editor"] }).notNull().default("editor"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Languages table
export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User language assignments (for editors)
export const userLanguages = pgTable("user_languages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  languageId: integer("language_id").notNull().references(() => languages.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audio projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  duration: integer("duration").notNull(), // in seconds
  sampleRate: integer("sample_rate").notNull(),
  channels: integer("channels").notNull(),
  languageId: integer("language_id").notNull().references(() => languages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status", { 
    enum: ["processing", "ready_for_validation", "in_validation", "completed", "failed"] 
  }).notNull().default("processing"),
  totalSegments: integer("total_segments").default(0),
  validatedSegments: integer("validated_segments").default(0),
  boundaryFScore: real("boundary_f_score"),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  transcriptionContext: text("transcription_context"), // Context prompt for better transcription
  domainType: varchar("domain_type", { length: 50 }), // e.g., "medical", "legal", "business", "educational"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audio segments (boundary detection results)
export const segments = pgTable("segments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  segmentNumber: integer("segment_number").notNull(),
  startTime: real("start_time").notNull(), // in seconds
  endTime: real("end_time").notNull(), // in seconds
  confidence: real("confidence").notNull(), // algorithm confidence 0-1
  processingMethod: varchar("processing_method", { length: 50 }).default('basic'), // 'basic' ou 'whisper'
  transcription: text("transcription"),
  isValidated: boolean("is_validated").notNull().default(false),
  isApproved: boolean("is_approved"),
  validatedBy: varchar("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Processing queue for async audio processing
export const processingQueue = pgTable("processing_queue", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  status: varchar("status", { 
    enum: ["pending", "processing", "completed", "failed"] 
  }).notNull().default("pending"),
  errorMessage: text("error_message"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userLanguages: many(userLanguages),
  projects: many(projects),
  validatedSegments: many(segments),
}));

export const languagesRelations = relations(languages, ({ many }) => ({
  userLanguages: many(userLanguages),
  projects: many(projects),
}));

export const userLanguagesRelations = relations(userLanguages, ({ one }) => ({
  user: one(users, {
    fields: [userLanguages.userId],
    references: [users.id],
  }),
  language: one(languages, {
    fields: [userLanguages.languageId],
    references: [languages.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  language: one(languages, {
    fields: [projects.languageId],
    references: [languages.id],
  }),
  segments: many(segments),
  processingQueue: many(processingQueue),
}));

export const segmentsRelations = relations(segments, ({ one }) => ({
  project: one(projects, {
    fields: [segments.projectId],
    references: [projects.id],
  }),
  validator: one(users, {
    fields: [segments.validatedBy],
    references: [users.id],
  }),
}));

export const processingQueueRelations = relations(processingQueue, ({ one }) => ({
  project: one(projects, {
    fields: [processingQueue.projectId],
    references: [projects.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  isActive: true,
});

export const insertLanguageSchema = createInsertSchema(languages).pick({
  code: true,
  name: true,
  isActive: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  originalFilename: true,
  filePath: true,
  duration: true,
  sampleRate: true,
  channels: true,
  languageId: true,
  userId: true,
  status: true,
  totalSegments: true,
  validatedSegments: true,
  boundaryFScore: true,
});

export const insertSegmentSchema = createInsertSchema(segments).pick({
  projectId: true,
  segmentNumber: true,
  startTime: true,
  endTime: true,
  confidence: true,
  transcription: true,
});

export const updateSegmentSchema = createInsertSchema(segments).pick({
  transcription: true,
  isValidated: true,
  isApproved: true,
  validatedBy: true,
  validatedAt: true,
}).partial();

export const insertUserLanguageSchema = createInsertSchema(userLanguages).pick({
  userId: true,
  languageId: true,
});

// Transcription examples for in-context learning
export const transcriptionExamples = pgTable("transcription_examples", {
  id: serial("id").primaryKey(),
  domainType: varchar("domain_type", { length: 50 }).notNull(), // e.g., "medical", "legal", "business"
  languageCode: varchar("language_code", { length: 10 }).notNull(),
  audioDescription: text("audio_description").notNull(), // Description of what was said
  correctTranscription: text("correct_transcription").notNull(), // Correct transcription
  commonMistakes: text("common_mistakes"), // JSON array of common transcription errors
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Learning from corrections - track user corrections to improve future transcriptions
export const transcriptionCorrections = pgTable("transcription_corrections", {
  id: serial("id").primaryKey(),
  segmentId: integer("segment_id").notNull().references(() => segments.id),
  originalTranscription: text("original_transcription").notNull(),
  correctedTranscription: text("corrected_transcription").notNull(),
  confidenceScore: real("confidence_score"), // Original confidence from Whisper
  correctedBy: varchar("corrected_by").notNull().references(() => users.id),
  domainType: varchar("domain_type", { length: 50 }),
  languageCode: varchar("language_code", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTranscriptionExampleSchema = createInsertSchema(transcriptionExamples).pick({
  domainType: true,
  languageCode: true,
  audioDescription: true,
  correctTranscription: true,
  commonMistakes: true,
  isActive: true,
  createdBy: true,
});

export const insertTranscriptionCorrectionSchema = createInsertSchema(transcriptionCorrections).pick({
  segmentId: true,
  originalTranscription: true,
  correctedTranscription: true,
  confidenceScore: true,
  correctedBy: true,
  domainType: true,
  languageCode: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Language = typeof languages.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Segment = typeof segments.$inferSelect;
export type InsertSegment = z.infer<typeof insertSegmentSchema>;
export type UpdateSegment = z.infer<typeof updateSegmentSchema>;

export type UserLanguage = typeof userLanguages.$inferSelect;
export type InsertUserLanguage = z.infer<typeof insertUserLanguageSchema>;

export type ProcessingQueueItem = typeof processingQueue.$inferSelect;

export type TranscriptionExample = typeof transcriptionExamples.$inferSelect;
export type InsertTranscriptionExample = z.infer<typeof insertTranscriptionExampleSchema>;

export type TranscriptionCorrection = typeof transcriptionCorrections.$inferSelect;
export type InsertTranscriptionCorrection = z.infer<typeof insertTranscriptionCorrectionSchema>;
