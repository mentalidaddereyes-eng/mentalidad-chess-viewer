import { type Game, type InsertGame, type MoveAnalysis, type InsertMoveAnalysis, type UserSettings, type InsertUserSettings, type Puzzle, type InsertPuzzle, type PuzzleAttempt, type InsertPuzzleAttempt, games, moveAnalyses, userSettings, puzzles, puzzleAttempts } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Game storage
  getGame(id: number): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  getAllGames(): Promise<Game[]>;
  
  // Move analysis cache (for performance)
  getMoveAnalysis(gameId: number, moveNumber: number): Promise<MoveAnalysis | undefined>;
  saveMoveAnalysis(analysis: InsertMoveAnalysis): Promise<MoveAnalysis>;
  getGameAnalyses(gameId: number): Promise<MoveAnalysis[]>;
  
  // User settings
  getSettings(): Promise<UserSettings | undefined>;
  updateSettings(settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  
  // Puzzles
  getAllPuzzles(filters?: { minRating?: number; maxRating?: number; themes?: string[] }): Promise<Puzzle[]>;
  getPuzzle(id: number): Promise<Puzzle | undefined>;
  createPuzzle(puzzle: InsertPuzzle): Promise<Puzzle>;
  
  // Puzzle attempts
  createPuzzleAttempt(attempt: InsertPuzzleAttempt): Promise<PuzzleAttempt>;
  getPuzzleAttempts(puzzleId: number): Promise<PuzzleAttempt[]>;
  getAllPuzzleAttempts(): Promise<PuzzleAttempt[]>;
  getPuzzleStats(): Promise<{
    totalAttempts: number;
    totalSolved: number;
    successRate: number;
    averageTime: number;
  }>;
}

export class DbStorage implements IStorage {
  async getGame(id: number): Promise<Game | undefined> {
    const result = await db.select().from(games).where(eq(games.id, id)).limit(1);
    return result[0];
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const result = await db.insert(games).values(insertGame).returning();
    return result[0];
  }

  async getAllGames(): Promise<Game[]> {
    return await db.select().from(games).orderBy(games.createdAt);
  }

  async getMoveAnalysis(gameId: number, moveNumber: number): Promise<MoveAnalysis | undefined> {
    const result = await db
      .select()
      .from(moveAnalyses)
      .where(and(eq(moveAnalyses.gameId, gameId), eq(moveAnalyses.moveNumber, moveNumber)))
      .limit(1);
    return result[0];
  }

  async saveMoveAnalysis(analysis: InsertMoveAnalysis): Promise<MoveAnalysis> {
    const result = await db.insert(moveAnalyses).values(analysis).returning();
    return result[0];
  }

  async getGameAnalyses(gameId: number): Promise<MoveAnalysis[]> {
    return await db
      .select()
      .from(moveAnalyses)
      .where(eq(moveAnalyses.gameId, gameId))
      .orderBy(moveAnalyses.moveNumber);
  }

  async getSettings(): Promise<UserSettings | undefined> {
    // Get the first settings record (global settings for now)
    const result = await db.select().from(userSettings).limit(1);
    return result[0];
  }

  async updateSettings(settings: Partial<InsertUserSettings>): Promise<UserSettings> {
    // Check if settings exist
    const existing = await this.getSettings();
    
    if (existing) {
      // Update existing settings
      const result = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.id, existing.id))
        .returning();
      return result[0];
    } else {
      // Create new settings record
      const result = await db
        .insert(userSettings)
        .values({
          userId: null,
          coachingStyle: settings.coachingStyle || "balanced",
          difficulty: settings.difficulty ?? 50,
          verbosity: settings.verbosity ?? 50,
          language: settings.language || "english",
        })
        .returning();
      return result[0];
    }
  }

  async getAllPuzzles(filters?: { minRating?: number; maxRating?: number; themes?: string[] }): Promise<Puzzle[]> {
    // Get all puzzles
    const allPuzzles = await db.select().from(puzzles).orderBy(puzzles.rating);
    
    // If no filters, return all
    if (!filters) {
      return allPuzzles;
    }
    
    // Filter in-memory
    return allPuzzles.filter(puzzle => {
      // Check rating range
      const ratingMatch = 
        (filters.minRating === undefined || (puzzle.rating !== null && puzzle.rating >= filters.minRating)) &&
        (filters.maxRating === undefined || (puzzle.rating !== null && puzzle.rating <= filters.maxRating));
      
      // Check theme match
      const themeMatch = 
        !filters.themes || 
        filters.themes.length === 0 || 
        (puzzle.theme && filters.themes.includes(puzzle.theme));
      
      return ratingMatch && themeMatch;
    });
  }

  async getPuzzle(id: number): Promise<Puzzle | undefined> {
    const result = await db.select().from(puzzles).where(eq(puzzles.id, id)).limit(1);
    return result[0];
  }

  async createPuzzle(puzzle: InsertPuzzle): Promise<Puzzle> {
    const result = await db.insert(puzzles).values(puzzle).returning();
    return result[0];
  }

  async createPuzzleAttempt(attempt: InsertPuzzleAttempt): Promise<PuzzleAttempt> {
    const result = await db.insert(puzzleAttempts).values(attempt).returning();
    return result[0];
  }

  async getPuzzleAttempts(puzzleId: number): Promise<PuzzleAttempt[]> {
    return await db
      .select()
      .from(puzzleAttempts)
      .where(eq(puzzleAttempts.puzzleId, puzzleId))
      .orderBy(puzzleAttempts.attemptedAt);
  }

  async getAllPuzzleAttempts(): Promise<PuzzleAttempt[]> {
    return await db
      .select()
      .from(puzzleAttempts)
      .orderBy(puzzleAttempts.attemptedAt);
  }

  async getPuzzleStats(): Promise<{
    totalAttempts: number;
    totalSolved: number;
    successRate: number;
    averageTime: number;
  }> {
    const attempts = await this.getAllPuzzleAttempts();
    
    const totalAttempts = attempts.length;
    const totalSolved = attempts.filter(a => a.solved === 1).length;
    const successRate = totalAttempts > 0 ? (totalSolved / totalAttempts) * 100 : 0;
    
    const attemptsWithTime = attempts.filter(a => a.timeSpent !== null && a.timeSpent !== undefined);
    const averageTime = attemptsWithTime.length > 0
      ? attemptsWithTime.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / attemptsWithTime.length
      : 0;
    
    return {
      totalAttempts,
      totalSolved,
      successRate: Math.round(successRate * 10) / 10,
      averageTime: Math.round(averageTime * 10) / 10,
    };
  }
}

export const storage = new DbStorage();
