// OpenAI integration for chess move analysis
// Based on javascript_openai blueprint

import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
 * Generate pedagogical chess commentary - Fix Pack v5
 * Profile: Doctor en Ciencias del Deporte y Entrenamiento Ajedrecístico
 * Features: No numeric evaluations, professional tone, multi-language support
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
    language = 'english',
    voiceMode = 'pro',
    coachingStyle = 'balanced'
  } = params;

  const languageInstruction = getLanguageInstruction(language);
  const styleInstruction = getStyleInstruction(coachingStyle);

  // Adjust vocabulary based on voice mode
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

Example GOOD responses:
"White controls the center nicely with the pawns on e4 and d4. The knight on f3 is well-placed to support kingside development. Consider castling soon to ensure king safety."

Example BAD responses (NEVER DO THIS):
"White is +0.43 better. The evaluation is +0.89 after Nf3." ❌
"Black is down -1.2 material" ❌`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a Doctor in Sports Science and Chess Training (PhD). You combine deep chess knowledge from Lichess and Chess.com with pedagogical expertise. ${styleInstruction} ${vocabularyLevel} NEVER use numeric evaluations in your explanations. ${languageInstruction}.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 250,
      temperature: 0.8, // Slightly creative for more human responses
    });

    const text = response.choices[0].message.content || "Let's analyze this interesting position together.";
    
    // Safety filter: Remove any numeric evaluations that slipped through
    const cleanedText = text
      .replace(/[+\-±]?\d+\.?\d*\s*(pawns?|centipawns?|cp|evaluation|eval)/gi, 'advantage')
      .replace(/[+\-±]\d+\.?\d*/g, '')
      .trim();

    return { text: cleanedText };
  } catch (error) {
    console.error("GPT comment error:", error);
    
    // Fallback responses (no generic phrases!)
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

Consider:
- The tactical and strategic implications
- Whether it's a strong move, inaccuracy, mistake, or blunder
- What the player should be thinking about

Respond in JSON format with:
{
  "analysis": "Your ${sentenceCount} sentence analysis",
  "evaluation": "brilliant" | "good" | "inaccuracy" | "mistake" | "blunder",
  "comment": "Optional one-sentence tip or alternative"
}`;

  const maxTokens = verbosity < 30 ? 200 : verbosity > 70 ? 400 : 300;

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

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
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

Provide a clear, helpful answer in ${sentenceCount} sentences using ${detailLevel}. ${languageInstruction}. Be encouraging and educational.`;

  const maxTokens = verbosity < 30 ? 150 : verbosity > 70 ? 350 : 250;

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

    return response.choices[0].message.content || "I'm here to help! Could you rephrase your question?";
  } catch (error) {
    console.error("OpenAI question error:", error);
    return "I'm having trouble processing that right now. Could you try asking again?";
  }
}
