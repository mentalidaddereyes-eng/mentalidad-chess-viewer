import { z } from "zod";

// Chess game data model
export const gameSchema = z.object({
  id: z.string(),
  pgn: z.string(),
  white: z.string(),
  black: z.string(),
  result: z.string().optional(),
  date: z.string().optional(),
  event: z.string().optional(),
  site: z.string().optional(),
  opening: z.string().optional(),
});

export type Game = z.infer<typeof gameSchema>;

export const insertGameSchema = gameSchema.omit({ id: true });
export type InsertGame = z.infer<typeof insertGameSchema>;

// Move analysis data model
export const moveAnalysisSchema = z.object({
  moveNumber: z.number(),
  move: z.string(),
  fen: z.string(),
  analysis: z.string(),
  evaluation: z.enum(["brilliant", "good", "inaccuracy", "mistake", "blunder"]).optional(),
  comment: z.string().optional(),
});

export type MoveAnalysis = z.infer<typeof moveAnalysisSchema>;

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
