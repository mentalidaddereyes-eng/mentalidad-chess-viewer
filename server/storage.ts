import { type Game, type InsertGame, type MoveAnalysis } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Game storage
  getGame(id: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  
  // Move analysis cache (optional, for performance)
  getMoveAnalysis(gameId: string, moveNumber: number): Promise<MoveAnalysis | undefined>;
  saveMoveAnalysis(gameId: string, analysis: MoveAnalysis): Promise<void>;
}

export class MemStorage implements IStorage {
  private games: Map<string, Game>;
  private analysisCache: Map<string, MoveAnalysis>;

  constructor() {
    this.games = new Map();
    this.analysisCache = new Map();
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = { ...insertGame, id };
    this.games.set(id, game);
    return game;
  }

  async getMoveAnalysis(gameId: string, moveNumber: number): Promise<MoveAnalysis | undefined> {
    return this.analysisCache.get(`${gameId}-${moveNumber}`);
  }

  async saveMoveAnalysis(gameId: string, analysis: MoveAnalysis): Promise<void> {
    this.analysisCache.set(`${gameId}-${analysis.moveNumber}`, analysis);
  }
}

export const storage = new MemStorage();
