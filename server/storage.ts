import { type Game, type InsertGame, type MoveAnalysis, type InsertMoveAnalysis, type UserSettings, type InsertUserSettings, games, moveAnalyses, userSettings } from "@shared/schema";
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
}

export const storage = new DbStorage();
