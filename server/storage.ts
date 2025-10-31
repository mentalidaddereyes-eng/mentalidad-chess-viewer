import { type Game, type InsertGame, type MoveAnalysis, type InsertMoveAnalysis, games, moveAnalyses } from "@shared/schema";
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
}

export const storage = new DbStorage();
