// ElevenLabs integration for text-to-speech - Hotfix v5.1.1
// Features: Multilingual voice support, LRU cache (200MB), async TTS, low-cost optimization

import { ElevenLabsClient } from "elevenlabs";
import { ttsCache, getTTSCacheKey } from "./cache";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export type VoiceMode = 'pro' | 'kids';
export type Language = 'spanish' | 'english' | 'portuguese' | 'hindi' | 'french' | 'german' | 'russian';

// Multilingual Voice IDs mapping (language + mode)
// Hotfix v5.1.1: Each language has Pro (Leo) and Kids (Augusto) voices
const VOICE_MAP: Record<Language, Record<VoiceMode, string>> = {
  spanish: {
    pro: process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB", // Leo (Adam) - Spanish
    kids: process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG", // Augusto (Antoni) - Spanish
  },
  english: {
    pro: process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB", // Leo (Adam) - English
    kids: process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG", // Augusto (Antoni) - English
  },
  portuguese: {
    pro: process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB", // Leo (Adam) - Portuguese
    kids: process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG", // Augusto (Antoni) - Portuguese
  },
  hindi: {
    pro: process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB", // Leo (Adam) - Hindi
    kids: process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG", // Augusto (Antoni) - Hindi
  },
  french: {
    pro: process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB", // Leo (Adam) - French
    kids: process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG", // Augusto (Antoni) - French
  },
  german: {
    pro: process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB", // Leo (Adam) - German
    kids: process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG", // Augusto (Antoni) - German
  },
  russian: {
    pro: process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB", // Leo (Adam) - Russian
    kids: process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG", // Augusto (Antoni) - Russian
  },
};

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice fallback

console.log('[voice] Hotfix v5.1.1 - Multilingual voice system initialized');

// Hotfix v5.1.1: Multilingual TTS with LRU cache (200MB budget)
export async function textToSpeech(
  text: string, 
  voiceMode: VoiceMode = 'pro',
  language: Language = 'spanish' // Default to Spanish per hotfix v5.1.1
): Promise<Buffer> {
  // Check cache first (low-cost optimization)
  const cacheKey = getTTSCacheKey(text, voiceMode, language);
  const cached = ttsCache.get(cacheKey);
  if (cached && Buffer.isBuffer(cached)) {
    console.log(`[voice] cache hit (${language}/${voiceMode}), skipping ElevenLabs call`);
    return cached;
  }

  try {
    // Select voice based on language + mode (Hotfix v5.1.1)
    const voiceId = VOICE_MAP[language]?.[voiceMode] || DEFAULT_VOICE_ID;
    
    console.log(`[voice] ${language}/${voiceMode} -> ${voiceId}, ElevenLabs API call`);

    const audio = await elevenlabs.generate({
      voice: voiceId,
      text: text,
      model_id: "eleven_multilingual_v2", // Multilingual model for all languages
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    
    const audioBuffer = Buffer.concat(chunks);
    
    // Store in cache for future reuse (language included in key)
    ttsCache.set(cacheKey, audioBuffer);
    console.log(`[voice] cached audio for ${language}/${voiceMode}`);
    
    return audioBuffer;
  } catch (error) {
    console.error(`[voice] ElevenLabs TTS error (${language}/${voiceMode}):`, error);
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
