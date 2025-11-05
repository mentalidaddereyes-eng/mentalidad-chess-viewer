// ElevenLabs integration for text-to-speech - Hotfix v5.1.1
// Features: Multilingual voice support, LRU cache (200MB), async TTS, low-cost optimization

import { ElevenLabsClient } from "elevenlabs";
import { ttsCache, getTTSCacheKey } from "./cache";

/**
 * Lazily create ElevenLabs client to avoid throwing at module import time
 * when ELEVENLABS_API_KEY is not configured (development environments).
 */
const getElevenLabsClient = () => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  try {
    return new ElevenLabsClient({ apiKey });
  } catch (e) {
    console.warn('[elevenlabs] failed to create client:', e);
    return null;
  }
};

export type VoiceMode = 'pro' | 'kids';
export type Language = 'spanish' | 'english' | 'portuguese' | 'hindi' | 'french' | 'german' | 'russian';

// Multilingual Voice IDs mapping (language + mode)
// Hotfix v5.1.1: Using ElevenLabs eleven_multilingual_v2 model for automatic language adaptation
// Default voices: Adam (Leo/Pro) and Antoni (Augusto/Kids) adapt to text language automatically
// For custom voices per language, set environment variables:
//   ELEVENLABS_VOICE_PRO_ES, ELEVENLABS_VOICE_PRO_PT, ELEVENLABS_VOICE_KIDS_HI, etc.
const VOICE_MAP: Record<Language, Record<VoiceMode, string>> = {
  spanish: {
    pro: process.env.ELEVENLABS_VOICE_PRO_ES || process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB", // Leo (Adam) - adapts to Spanish via eleven_multilingual_v2
    kids: process.env.ELEVENLABS_VOICE_KIDS_ES || process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG", // Augusto (Antoni) - adapts to Spanish
  },
  english: {
    pro: process.env.ELEVENLABS_VOICE_PRO_EN || process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB",
    kids: process.env.ELEVENLABS_VOICE_KIDS_EN || process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG",
  },
  portuguese: {
    pro: process.env.ELEVENLABS_VOICE_PRO_PT || process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB",
    kids: process.env.ELEVENLABS_VOICE_KIDS_PT || process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG",
  },
  hindi: {
    pro: process.env.ELEVENLABS_VOICE_PRO_HI || process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB",
    kids: process.env.ELEVENLABS_VOICE_KIDS_HI || process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG",
  },
  french: {
    pro: process.env.ELEVENLABS_VOICE_PRO_FR || process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB",
    kids: process.env.ELEVENLABS_VOICE_KIDS_FR || process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG",
  },
  german: {
    pro: process.env.ELEVENLABS_VOICE_PRO_DE || process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB",
    kids: process.env.ELEVENLABS_VOICE_KIDS_DE || process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG",
  },
  russian: {
    pro: process.env.ELEVENLABS_VOICE_PRO_RU || process.env.ELEVENLABS_VOICE_PRO || "pNInz6obpgDQGcFmaJgB",
    kids: process.env.ELEVENLABS_VOICE_KIDS_RU || process.env.ELEVENLABS_VOICE_KIDS || "VR6AewLTigWG4xSOukaG",
  },
};

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice fallback

console.log('[voice] Hotfix v5.1.1 - Multilingual voice system initialized');

// Hotfix v5.1.1 + v6.1: Multilingual TTS with LRU cache (200MB budget) + ENV fallback
export async function textToSpeech(
  text: string, 
  voiceMode: VoiceMode = 'pro',
  language: Language = 'spanish' // HOTFIX v6.1: Spanish default
): Promise<Buffer> {
  // HOTFIX v6.1: Lazily obtain ElevenLabs client; if not configured, return an empty buffer so server can run in dev
  const elevenlabs = getElevenLabsClient();
  if (!elevenlabs) {
    console.warn('[voice] ELEVENLABS_API_KEY not configured - returning empty audio buffer');
    return Buffer.alloc(0);
  }
  
  // Check cache first (low-cost optimization) - Cost Saver Pack v6.0: includes provider
  const cacheKey = getTTSCacheKey(text, voiceMode, language, 'elevenlabs');
  const cached = ttsCache.get(cacheKey);
  if (cached && Buffer.isBuffer(cached)) {
    console.log(`[voice] cache hit (${language}/${voiceMode}), skipping ElevenLabs call`);
    return cached;
  }

  try {
    // Select voice based on language + mode (HOTFIX v6.1: with ENV fallback)
    const voiceId = VOICE_MAP[language]?.[voiceMode] || DEFAULT_VOICE_ID;
    
    if (!voiceId) {
      throw new Error(`No voice ID configured for ${language}/${voiceMode}`);
    }
    
    console.log(`[voice] lang=${language} provider=pro voiceId=${voiceId}`);

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
    const client = getElevenLabsClient();
    if (!client) {
      console.warn('[voice] ELEVENLABS_API_KEY not configured - getVoices returning empty list');
      return [];
    }
    const voices = await client.voices.getAll();
    return voices.voices;
  } catch (error) {
    console.error("ElevenLabs get voices error:", error);
    return [];
  }
}
