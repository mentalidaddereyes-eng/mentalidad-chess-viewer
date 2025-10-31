import { pgTable, serial, varchar, text, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// Database Tables
// ============================================================================

// Games table - stores imported chess games
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  pgn: text("pgn").notNull(),
  white: varchar("white", { length: 255 }).notNull(),
  black: varchar("black", { length: 255 }).notNull(),
  result: varchar("result", { length: 20 }),
  date: varchar("date", { length: 50 }),
  event: varchar("event", { length: 255 }),
  site: varchar("site", { length: 255 }),
  opening: varchar("opening", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Move analyses table - caches AI analysis and engine evaluations
export const moveAnalyses = pgTable("move_analyses", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  moveNumber: integer("move_number").notNull(),
  move: varchar("move", { length: 20 }).notNull(),
  fen: text("fen").notNull(),
  analysis: text("analysis").notNull(),
  evaluation: varchar("evaluation", { length: 20 }), // brilliant, good, inaccuracy, mistake, blunder
  comment: text("comment"),
  score: integer("score"), // Centipawn evaluation (positive = white advantage)
  mate: integer("mate"), // Mate in N moves (positive = white mates, negative = black mates)
  bestMove: varchar("best_move", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table - for future authentication and personalization
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  lichessUsername: varchar("lichess_username", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Training sessions table - tracks when users practice
export const trainingSessions = pgTable("training_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  gameId: integer("game_id").references(() => games.id, { onDelete: "cascade" }),
  sessionType: varchar("session_type", { length: 50 }).notNull(), // analysis, puzzles, opening, endgame
  duration: integer("duration"), // Session duration in seconds
  movesAnalyzed: integer("moves_analyzed"),
  questionsAsked: integer("questions_asked"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

// Progress stats table - tracks user improvement metrics
export const progressStats = pgTable("progress_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  statType: varchar("stat_type", { length: 50 }).notNull(), // rating, puzzles_solved, accuracy, etc.
  value: integer("value").notNull(),
  metadata: json("metadata"), // Additional context (e.g., opening name, puzzle theme)
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// Puzzles table - stores chess tactics puzzles
export const puzzles = pgTable("puzzles", {
  id: serial("id").primaryKey(),
  fen: text("fen").notNull(), // Starting position
  solution: text("solution").notNull(), // Solution move(s) (e.g., "Qxf7#" or "Nxe5")
  explanation: text("explanation"), // Explanation of the puzzle solution
  theme: varchar("theme", { length: 100 }), // Puzzle theme (e.g., "Knight fork", "Checkmate in 1")
  rating: integer("rating"), // Difficulty rating
  source: varchar("source", { length: 100 }), // lichess, custom, etc.
  externalId: varchar("external_id", { length: 100 }), // ID from external source
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Puzzle attempts table - tracks user puzzle solving history
export const puzzleAttempts = pgTable("puzzle_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  puzzleId: integer("puzzle_id").notNull().references(() => puzzles.id, { onDelete: "cascade" }),
  solved: integer("solved").notNull(), // 1 = solved, 0 = failed
  timeSpent: integer("time_spent"), // Time in seconds
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});

// User settings table - stores coaching preferences
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  coachingStyle: varchar("coaching_style", { length: 50 }).notNull().default("balanced"),
  difficulty: integer("difficulty").notNull().default(50),
  verbosity: integer("verbosity").notNull().default(50),
  language: varchar("language", { length: 20 }).notNull().default("english"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Insert Schemas (Zod validation)
// ============================================================================

export const insertGameSchema = createInsertSchema(games).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertGame = z.infer<typeof insertGameSchema>;

export const insertMoveAnalysisSchema = createInsertSchema(moveAnalyses).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertMoveAnalysis = z.infer<typeof insertMoveAnalysisSchema>;

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertTrainingSessionSchema = createInsertSchema(trainingSessions).omit({ 
  id: true, 
  startedAt: true 
});
export type InsertTrainingSession = z.infer<typeof insertTrainingSessionSchema>;

export const insertProgressStatSchema = createInsertSchema(progressStats).omit({ 
  id: true, 
  recordedAt: true 
});
export type InsertProgressStat = z.infer<typeof insertProgressStatSchema>;

export const insertPuzzleSchema = createInsertSchema(puzzles).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertPuzzle = z.infer<typeof insertPuzzleSchema>;

export const insertPuzzleAttemptSchema = createInsertSchema(puzzleAttempts).omit({ 
  id: true, 
  attemptedAt: true 
});
export type InsertPuzzleAttempt = z.infer<typeof insertPuzzleAttemptSchema>;

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ 
  id: true, 
  updatedAt: true 
});
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// ============================================================================
// Select Types (TypeScript types for queried data)
// ============================================================================

export type Game = typeof games.$inferSelect;
export type MoveAnalysis = typeof moveAnalyses.$inferSelect;
export type User = typeof users.$inferSelect;
export type TrainingSession = typeof trainingSessions.$inferSelect;
export type ProgressStat = typeof progressStats.$inferSelect;
export type Puzzle = typeof puzzles.$inferSelect;
export type PuzzleAttempt = typeof puzzleAttempts.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;

// ============================================================================
// API Request/Response Schemas (for routes that don't map to tables)
// ============================================================================

// Move analysis data model (for API responses)
export const moveAnalysisSchema = z.object({
  moveNumber: z.number(),
  move: z.string(),
  fen: z.string(),
  analysis: z.string(),
  evaluation: z.enum(["brilliant", "good", "inaccuracy", "mistake", "blunder"]).optional(),
  comment: z.string().optional(),
  score: z.number().optional(),
  mate: z.number().optional(),
  bestMove: z.string().optional(),
});

// Voice interaction data model
export const voiceQuestionSchema = z.object({
  question: z.string(),
  context: z.object({
    currentMove: z.number(),
    fen: z.string(),
    moveHistory: z.array(z.string()),
  }),
});

export type VoiceQuestion = z.infer<typeof voiceQuestionSchema>;

export const voiceResponseSchema = z.object({
  answer: z.string(),
  audioUrl: z.string().optional(),
});

export type VoiceResponse = z.infer<typeof voiceResponseSchema>;

// Lichess game import schemas
export const lichessImportSchema = z.object({
  type: z.enum(["url", "username"]),
  value: z.string(),
  gameIndex: z.number().optional().default(0),
});

export type LichessImport = z.infer<typeof lichessImportSchema>;
