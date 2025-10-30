// OpenAI integration for chess move analysis
// Based on javascript_openai blueprint

import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeMove(
  moveNumber: number,
  move: string,
  fen: string,
  moveHistory: string[]
): Promise<{
  analysis: string;
  evaluation?: "brilliant" | "good" | "inaccuracy" | "mistake" | "blunder";
  comment?: string;
}> {
  const prompt = `You are a grandmaster chess coach analyzing a game. 

Position (FEN): ${fen}
Move ${moveNumber}: ${move}
Previous moves: ${moveHistory.slice(0, moveNumber).join(" ")}

Provide a brief, insightful analysis of this move in 2-3 sentences. Consider:
- The tactical and strategic implications
- Whether it's a strong move, inaccuracy, mistake, or blunder
- What the player should be thinking about

Respond in JSON format with:
{
  "analysis": "Your 2-3 sentence analysis",
  "evaluation": "brilliant" | "good" | "inaccuracy" | "mistake" | "blunder",
  "comment": "Optional one-sentence tip or alternative"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a friendly, encouraging grandmaster chess coach. Keep your analysis concise and educational.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 300,
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
  }
): Promise<string> {
  const prompt = `You are a grandmaster chess coach having a conversation with your student.

Current position (FEN): ${context.fen}
Move number: ${context.currentMove}
Moves played: ${context.moveHistory.slice(0, context.currentMove).join(" ")}

Student's question: "${question}"

Provide a clear, helpful answer in 2-4 sentences. Be encouraging and educational.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a friendly, patient grandmaster chess coach. Answer questions clearly and encourage learning.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 250,
    });

    return response.choices[0].message.content || "I'm here to help! Could you rephrase your question?";
  } catch (error) {
    console.error("OpenAI question error:", error);
    return "I'm having trouble processing that right now. Could you try asking again?";
  }
}
