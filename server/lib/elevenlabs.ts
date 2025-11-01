// ElevenLabs integration for text-to-speech

import { ElevenLabsClient } from "elevenlabs";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Voice IDs from environment variables (secure)
const VOICE_PRO = process.env.ELEVENLABS_VOICE_PRO; // Leo voice for professional mode
const VOICE_KIDS = process.env.ELEVENLABS_VOICE_KIDS; // Augusto voice for kids mode
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice fallback

export type VoiceMode = 'pro' | 'kids';

console.log('[voice] init ok (muted)');
console.log('[voice] VOICE_PRO available:', !!VOICE_PRO);
console.log('[voice] VOICE_KIDS available:', !!VOICE_KIDS);

export async function textToSpeech(text: string, voiceMode: VoiceMode = 'pro'): Promise<Buffer> {
  try {
    // Select voice based on mode
    let voiceId: string;
    if (voiceMode === 'pro' && VOICE_PRO) {
      voiceId = VOICE_PRO;
      console.log('[voice] mode: pro (Leo)');
    } else if (voiceMode === 'kids' && VOICE_KIDS) {
      voiceId = VOICE_KIDS;
      console.log('[voice] mode: kids (Augusto)');
    } else {
      voiceId = DEFAULT_VOICE_ID;
      console.log('[voice] fallback to default voice');
    }

    console.log('[voice] elevenlabs used, single-channel enforced');

    const audio = await elevenlabs.generate({
      voice: voiceId,
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
    console.error("[voice] ElevenLabs TTS error:", error);
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
