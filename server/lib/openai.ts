// OpenAI integration for chess move analysis - Cost Saver Pack v6.0
// Features: GPT memo+rate-limit, local templates, trivial detection, max 2 calls/min

import OpenAI from "openai";
import { getLocalTemplate } from "./cache";
import { gptMemo, isTrivialPosition } from "./gpt-memo";

/**
 * Lazily initialize OpenAI client. Avoid constructing the client at module
 * import time so the server can start without OPENAI_API_KEY in development.
 */
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    return new OpenAI({ apiKey });
  } catch (e) {
    console.warn('[openai] failed to create client:', e);
    return null;
  }
};

// Debounce map for GPT requests (400ms budget)
const gptDebounceMap = new Map<string, { timer: NodeJS.Timeout; resolve: (value: any) => void; reject: (error: any) => void }[]>();

interface CoachingSettings {
  coachingStyle?: string;
  difficulty?: number;
  verbosity?: number;
  language?: string;
}

function getStyleInstruction(style: string): string {
  const styles: Record<string, string> = {
    aggressive: "Focus on attacking opportunities, tactical sharpness, and initiative. Encourage bold, aggressive play.",
    positional: "Emphasize pawn structure, piece placement, long-term planning, and positional understanding.",
    tactical: "Highlight tactical motifs, combinations, and concrete calculations. Look for tactical opportunities.",
    balanced: "Provide a well-rounded analysis covering both tactics and strategy.",
    defensive: "Focus on solid play, defensive resources, and safe, risk-averse moves."
  };
  return styles[style] || styles.balanced;
}

function getLanguageInstruction(language: string): string {
  const languages: Record<string, string> = {
    spanish: "Respond in Spanish (Español)",
    english: "Respond in English",
    portuguese: "Respond in Portuguese (Português)",
    hindi: "Respond in Hindi (हिन्दी)",
    french: "Respond in French (Français)",
    german: "Respond in German (Deutsch)",
    russian: "Respond in Russian (Русский)"
  };
  return languages[language] || languages.english;
}

/**
 * Generate pedagogical chess commentary - Cost Saver Pack v6.0
 * Profile: Doctor en Ciencias del Deporte y Entrenamiento Ajedrecístico
 * Features: GPT memo (hash-based), rate-limit (2/min), trivial detection, max 200 chars
 */
export async function getGPTComment(params: {
  fen: string;
  bestMove?: string;
  score?: number;
  mate?: number;
  moveHistory?: string[];
  language?: string;
  voiceMode?: 'pro' | 'kids';
  coachingStyle?: string;
}): Promise<{ text: string }> {
  const {
    fen,
    bestMove,
    score,
    mate,
    moveHistory = [],
    language = 'spanish',
    voiceMode = 'pro',
    coachingStyle = 'balanced'
  } = params;

  const bestSan = bestMove || '';

  // 1. Check local templates first (Cost Saver v6.0)
  const localTemplate = getLocalTemplate(fen, language, voiceMode);
  if (localTemplate) {
    console.log('[gpt] local template used (no GPT call)');
    return { text: localTemplate };
  }

  // 2. Check trivial positions (no GPT needed)
  if (isTrivialPosition(fen, bestSan, score, mate)) {
    const trivialFallback = voiceMode === 'kids'
      ? 'This position is clear! Follow the best move.'
      : 'The position evaluation is straightforward. Execute the indicated continuation.';
    console.log('[gpt] trivial position detected, using fallback');
    return { text: trivialFallback };
  }

  // 3. Check GPT memo (hash-based with TTL)
  const memoHit = gptMemo.get(fen, language, voiceMode, bestSan);
  if (memoHit) {
    return { text: memoHit };
  }

  // 4. Rate limit check
  if (!gptMemo.canMakeGPTCall()) {
    const rateLimitFallback = voiceMode === 'kids'
      ? 'Great moves! Keep thinking carefully about each position.'
      : 'Continue analyzing the position thoughtfully. Consider your strategic objectives.';
    console.log('[gpt] rate limit exceeded, using fallback');
    return { text: rateLimitFallback };
  }

  const languageInstruction = getLanguageInstruction(language);
  const styleInstruction = getStyleInstruction(coachingStyle);

  const vocabularyLevel = voiceMode === 'kids'
    ? 'Use simple, friendly language suitable for young students. Avoid complex chess terminology.'
    : 'Use professional Grand Master terminology. You may use advanced concepts like zugzwang, prophylaxis, initiative.';

  // Build position context
  let positionContext = '';
  if (mate !== undefined && mate !== null) {
    if (mate > 0) {
      positionContext = `White has a forced checkmate in ${mate} moves.`;
    } else if (mate < 0) {
      positionContext = `Black has a forced checkmate in ${Math.abs(mate)} moves.`;
    }
  } else if (score !== undefined && score !== null) {
    if (score > 200) {
      positionContext = 'White has a significant advantage.';
    } else if (score > 50) {
      positionContext = 'White is slightly better.';
    } else if (score < -200) {
      positionContext = 'Black has a significant advantage.';
    } else if (score < -50) {
      positionContext = 'Black is slightly better.';
    } else {
      positionContext = 'The position is relatively balanced.';
    }
  }

  const prompt = `You are a Doctor in Sports Science and Chess Training with expertise from Lichess and Chess.com platforms. ${styleInstruction}

Position (FEN): ${fen}
Best continuation: ${bestMove || 'Analyzing...'}
${positionContext}
Recent moves: ${moveHistory.slice(-6).join(' ') || 'Starting position'}

${vocabularyLevel}

Provide professional, pedagogical commentary about this chess position in 2-3 sentences. ${languageInstruction}.

CRITICAL RULES:
- NEVER include numeric evaluations like "+0.3", "-0.4", "±0.2", "+1.5", etc.
- NEVER mention centipawns, scores, or evaluation numbers
- Use qualitative descriptions: "White is better", "balanced position", "Black has advantage"
- Be motivating, analytical, and educational
- Focus on IDEAS, PLANS, and CONCEPTS
- Teach WHY moves are good or bad, not HOW MUCH better they are numerically
`;

  // 5. Make GPT call (record for rate limiting)
  gptMemo.recordGPTCall();

  const openai = getOpenAIClient();
  if (!openai) {
    console.warn('[openai] OPENAI_API_KEY not set - returning fallback comment');
    const fallback = voiceMode === 'kids'
      ? 'This is an interesting position! Keep practicing and focus on development and king safety.'
      : 'This position is instructive. Consider piece coordination and candidate moves; try to improve piece activity.';
    gptMemo.set(fen, language, voiceMode, bestSan, fallback);
    return { text: fallback };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a Doctor in Sports Science and Chess Training (PhD). ${styleInstruction} ${vocabularyLevel} NEVER use numeric evaluations in your explanations. ${languageInstruction}.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 200,
    });

    let text = response.choices?.[0]?.message?.content || "Let's analyze this interesting position together.";

    // Safety filter: Remove numeric evaluations
    text = text
      .replace(/[+\-±]?\d+\.?\d*\s*(pawns?|centipawns?|cp|evaluation|eval)/gi, 'advantage')
      .replace(/[+\-±]\d+\.?\d*/g, '')
      .trim();

    const cleanedText = text.length > 200 ? text.substring(0, 197) + '...' : text;

    gptMemo.set(fen, language, voiceMode, bestSan, cleanedText);

    return { text: cleanedText };
  } catch (error) {
    console.error("GPT comment error:", error);
    const fallbacks = voiceMode === 'kids' ? [
      "This is an interesting position! Let's think about our best moves.",
      "Great game so far! Remember to think about your piece development.",
      "Nice! Let's see what plans we can find in this position."
    ] : [
      "This position offers interesting strategic possibilities. Consider your piece coordination carefully.",
      "The current setup requires careful planning. Evaluate your candidate moves thoroughly.",
      "An intriguing position that demands precise calculation. Focus on your tactical opportunities."
    ];
    return { text: fallbacks[Math.floor(Math.random() * fallbacks.length)] };
  }
}

export async function analyzeMove(
  moveNumber: number,
  move: string,
  fen: string,
  moveHistory: string[],
  settings: CoachingSettings = {}
): Promise<{
  analysis: string;
  evaluation?: "brilliant" | "good" | "inaccuracy" | "mistake" | "blunder";
  comment?: string;
}> {
  const { coachingStyle = "balanced", difficulty = 50, verbosity = 50, language = "english" } = settings;

  const styleInstruction = getStyleInstruction(coachingStyle);
  const languageInstruction = getLanguageInstruction(language);
  const sentenceCount = verbosity < 30 ? "1-2" : verbosity > 70 ? "3-4" : "2-3";
  const detailLevel = difficulty < 30 ? "simple, beginner-friendly" : difficulty > 70 ? "deep, advanced" : "intermediate";

  const prompt = `You are a grandmaster chess coach analyzing a game. ${styleInstruction}

Position (FEN): ${fen}
Move ${moveNumber}: ${move}
Previous moves: ${moveHistory.slice(0, moveNumber).join(" ")}

Provide a ${detailLevel} analysis of this move in ${sentenceCount} sentences. ${languageInstruction}.
`;

  const maxTokens = verbosity < 30 ? 200 : verbosity > 70 ? 400 : 300;

  const openai = getOpenAIClient();
  if (!openai) {
    console.warn('[openai] OPENAI_API_KEY not set - returning fallback analysis');
    return {
      analysis: "Quick analysis: consider development and king safety. Evaluate candidate moves carefully.",
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a friendly, encouraging grandmaster chess coach. ${styleInstruction} Keep your analysis concise and educational. ${languageInstruction}.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens,
    });

    const result = JSON.parse(response.choices?.[0]?.message?.content || "{}");

    return {
      analysis: result.analysis || "Analyzing this position...",
      evaluation: result.evaluation,
      comment: result.comment,
    };
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    return {
      analysis: "I'm analyzing this position. The move appears to be playable.",
    };
  }
}

export async function answerQuestion(
  question: string,
  context: {
    currentMove: number;
    fen: string;
    moveHistory: string[];
  },
  settings: CoachingSettings = {}
): Promise<string> {
  const { coachingStyle = "balanced", difficulty = 50, verbosity = 50, language = "english" } = settings;

  const styleInstruction = getStyleInstruction(coachingStyle);
  const languageInstruction = getLanguageInstruction(language);
  const sentenceCount = verbosity < 30 ? "1-2" : verbosity > 70 ? "3-5" : "2-4";
  const detailLevel = difficulty < 30 ? "simple terms" : difficulty > 70 ? "advanced detail" : "intermediate level";

  const prompt = `You are a grandmaster chess coach having a conversation with your student. ${styleInstruction}

Current position (FEN): ${context.fen}
Move number: ${context.currentMove}
Moves played: ${context.moveHistory.slice(0, context.currentMove).join(" ")}

Student's question: "${question}"

Provide a clear, helpful answer in ${sentenceCount} sentences using ${detailLevel}. ${languageInstruction}. Be encouraging and educational.
`;

  const maxTokens = verbosity < 30 ? 150 : verbosity > 70 ? 350 : 250;

  const openai = getOpenAIClient();
  if (!openai) {
    console.warn('[openai] OPENAI_API_KEY not set - returning fallback answer');
    return "I can't call the AI right now, but generally: check development, piece activity, and candidate moves. Try simplifying your question.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a friendly, patient grandmaster chess coach. ${styleInstruction} Answer questions clearly and encourage learning. ${languageInstruction}.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: maxTokens,
    });

    return response.choices?.[0]?.message?.content || "I'm here to help! Could you rephrase your question?";
  } catch (error) {
    console.error("OpenAI question error:", error);
    return "I'm having trouble processing that right now. Could you try asking again?";
  }
}
