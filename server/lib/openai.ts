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
    french: "Respond in French (Français)",
    german: "Respond in German (Deutsch)",
    russian: "Respond in Russian (Русский)",
    english: "Respond in English"
  };
  return languages[language] || languages.english;
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
