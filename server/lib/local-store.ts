import fs from 'fs/promises';
import path from 'path';
import type { 
  Game, InsertGame, 
  MoveAnalysis, InsertMoveAnalysis,
  UserSettings, InsertUserSettings,
  Puzzle, InsertPuzzle,
  PuzzleAttempt, InsertPuzzleAttempt
} from '@shared/schema';

const STORE_PATH = '/tmp/gm-trainer-store.json';

interface StoreData {
  games: Game[];
  moveAnalyses: MoveAnalysis[];
  settings: UserSettings | null;
  puzzles: Puzzle[];
  puzzleAttempts: PuzzleAttempt[];
  nextId: {
    game: number;
    moveAnalysis: number;
    settings: number;
    puzzle: number;
    puzzleAttempt: number;
  };
}

export class LocalStore {
  private data: StoreData | null = null;
  private initialized = false;

  private getDefaultData(): StoreData {
    return {
      games: [],
      moveAnalyses: [],
      settings: null,
      puzzles: [],
      puzzleAttempts: [],
      nextId: {
        game: 1,
        moveAnalysis: 1,
        settings: 1,
        puzzle: 1,
        puzzleAttempt: 1,
      },
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const fileContent = await fs.readFile(STORE_PATH, 'utf-8');
      // HOTFIX v6.1: Revive Date objects from ISO strings
      this.data = JSON.parse(fileContent, (key, value) => {
        if (key === 'createdAt' || key === 'updatedAt' || key === 'attemptedAt') {
          return value ? new Date(value) : value;
        }
        return value;
      });
      console.log('[local-store] loaded from', STORE_PATH);
    } catch (error) {
      this.data = this.getDefaultData();
      await this.persist();
      console.log('[local-store] initialized new store at', STORE_PATH);
    }
    
    this.initialized = true;
  }

  private async persist(): Promise<void> {
    if (!this.data) return;
    
    try {
      await fs.writeFile(STORE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('[local-store] persist error:', error);
    }
  }

  async getSettings(): Promise<UserSettings | null> {
    await this.ensureInitialized();
    return this.data!.settings;
  }

  async updateSettings(settings: Partial<InsertUserSettings>): Promise<UserSettings> {
    await this.ensureInitialized();
    
    const existing = this.data!.settings;
    
    if (existing) {
      const updated: UserSettings = {
        ...existing,
        ...settings,
        updatedAt: new Date(),
      };
      this.data!.settings = updated;
      await this.persist();
      return updated;
    } else {
      const newSettings: UserSettings = {
        id: this.data!.nextId.settings++,
        userId: null,
        coachingStyle: settings.coachingStyle || 'balanced',
        difficulty: settings.difficulty ?? 50,
        verbosity: settings.verbosity ?? 50,
        language: settings.language || 'spanish', // HOTFIX v6.1: Spanish default
        updatedAt: new Date(),
      };
      this.data!.settings = newSettings;
      await this.persist();
      return newSettings;
    }
  }

  async getGame(id: number): Promise<Game | undefined> {
    await this.ensureInitialized();
    return this.data!.games.find(g => g.id === id);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    await this.ensureInitialized();
    
    const game: Game = {
      id: this.data!.nextId.game++,
      pgn: insertGame.pgn,
      white: insertGame.white,
      black: insertGame.black,
      date: insertGame.date ?? null,
      result: insertGame.result ?? null,
      event: insertGame.event ?? null,
      site: insertGame.site ?? null,
      opening: insertGame.opening ?? null,
      createdAt: new Date(),
    };
    
    this.data!.games.push(game);
    await this.persist();
    return game;
  }

  async getAllGames(): Promise<Game[]> {
    await this.ensureInitialized();
    return [...this.data!.games].sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  async getAllPuzzles(filters?: { minRating?: number; maxRating?: number; themes?: string[] }): Promise<Puzzle[]> {
    await this.ensureInitialized();
    
    let puzzles = [...this.data!.puzzles];
    
    if (filters) {
      puzzles = puzzles.filter(puzzle => {
        const ratingMatch = 
          (filters.minRating === undefined || (puzzle.rating !== null && puzzle.rating >= filters.minRating)) &&
          (filters.maxRating === undefined || (puzzle.rating !== null && puzzle.rating <= filters.maxRating));
        
        const themeMatch = 
          !filters.themes || 
          filters.themes.length === 0 || 
          (puzzle.theme && filters.themes.includes(puzzle.theme));
        
        return ratingMatch && themeMatch;
      });
    }
    
    return puzzles.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  }

  async getPuzzle(id: number): Promise<Puzzle | undefined> {
    await this.ensureInitialized();
    return this.data!.puzzles.find(p => p.id === id);
  }

  async createPuzzle(insertPuzzle: InsertPuzzle): Promise<Puzzle> {
    await this.ensureInitialized();
    
    const puzzle: Puzzle = {
      id: this.data!.nextId.puzzle++,
      fen: insertPuzzle.fen,
      solution: insertPuzzle.solution,
      explanation: insertPuzzle.explanation ?? null,
      theme: insertPuzzle.theme ?? null,
      rating: insertPuzzle.rating ?? null,
      source: insertPuzzle.source ?? null,
      externalId: insertPuzzle.externalId ?? null,
      createdAt: new Date(),
    };
    
    this.data!.puzzles.push(puzzle);
    await this.persist();
    return puzzle;
  }

  async createPuzzleAttempt(attempt: InsertPuzzleAttempt): Promise<PuzzleAttempt> {
    await this.ensureInitialized();
    
    const puzzleAttempt: PuzzleAttempt = {
      id: this.data!.nextId.puzzleAttempt++,
      userId: attempt.userId ?? null,
      puzzleId: attempt.puzzleId,
      solved: attempt.solved,
      timeSpent: attempt.timeSpent ?? null,
      attemptedAt: new Date(),
    };
    
    this.data!.puzzleAttempts.push(puzzleAttempt);
    await this.persist();
    return puzzleAttempt;
  }

  async getPuzzleAttempts(puzzleId: number): Promise<PuzzleAttempt[]> {
    await this.ensureInitialized();
    return this.data!.puzzleAttempts
      .filter(a => a.puzzleId === puzzleId)
      .sort((a, b) => a.attemptedAt.getTime() - b.attemptedAt.getTime());
  }

  async getAllPuzzleAttempts(): Promise<PuzzleAttempt[]> {
    await this.ensureInitialized();
    return [...this.data!.puzzleAttempts].sort((a, b) => 
      a.attemptedAt.getTime() - b.attemptedAt.getTime()
    );
  }

  async getPuzzleStats(): Promise<{
    totalAttempts: number;
    totalSolved: number;
    successRate: number;
    averageTime: number;
  }> {
    await this.ensureInitialized();
    
    const attempts = this.data!.puzzleAttempts;
    const totalAttempts = attempts.length;
    const totalSolved = attempts.filter(a => a.solved).length;
    const successRate = totalAttempts > 0 ? (totalSolved / totalAttempts) * 100 : 0;
    const averageTime = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / totalAttempts
      : 0;

    return {
      totalAttempts,
      totalSolved,
      successRate,
      averageTime,
    };
  }

  async getMoveAnalysis(gameId: number, moveNumber: number): Promise<MoveAnalysis | undefined> {
    await this.ensureInitialized();
    return this.data!.moveAnalyses.find(
      a => a.gameId === gameId && a.moveNumber === moveNumber
    );
  }

  async saveMoveAnalysis(analysis: InsertMoveAnalysis): Promise<MoveAnalysis> {
    await this.ensureInitialized();
    
    const moveAnalysis: MoveAnalysis = {
      id: this.data!.nextId.moveAnalysis++,
      gameId: analysis.gameId,
      moveNumber: analysis.moveNumber,
      move: analysis.move,
      fen: analysis.fen,
      analysis: analysis.analysis,
      evaluation: analysis.evaluation ?? null,
      comment: analysis.comment ?? null,
      score: analysis.score ?? null,
      mate: analysis.mate ?? null,
      bestMove: analysis.bestMove ?? null,
      createdAt: new Date(),
    };
    
    this.data!.moveAnalyses.push(moveAnalysis);
    await this.persist();
    return moveAnalysis;
  }

  async getGameAnalyses(gameId: number): Promise<MoveAnalysis[]> {
    await this.ensureInitialized();
    return this.data!.moveAnalyses
      .filter(a => a.gameId === gameId)
      .sort((a, b) => a.moveNumber - b.moveNumber);
  }
}

export const localStore = new LocalStore();
