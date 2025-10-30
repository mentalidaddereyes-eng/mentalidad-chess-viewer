// ElevenLabs integration for text-to-speech

import { ElevenLabsClient } from "elevenlabs";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// You can find voice IDs in your ElevenLabs account
// Using a default voice for now - user can configure their cloned voice later
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

export async function textToSpeech(text: string, voiceId?: string): Promise<Buffer> {
  try {
    const audio = await elevenlabs.generate({
      voice: voiceId || DEFAULT_VOICE_ID,
      text: text,
      model_id: "eleven_monolingual_v1",
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    throw new Error("Failed to generate speech");
  }
}

export async function getVoices() {
  try {
    const voices = await elevenlabs.voices.getAll();
    return voices.voices;
  } catch (error) {
    console.error("ElevenLabs get voices error:", error);
    return [];
  }
}
