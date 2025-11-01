// Cost Saver Pack v6.0: Multi-provider TTS system with fallback
// Pro: ElevenLabs | Free: gTTS | Fallback: gTTS if ElevenLabs fails/times out

import { textToSpeech as elevenLabsTTS, type VoiceMode, type Language } from './elevenlabs';
import { generateGTTS } from './gtts';
import { ttsCache, getTTSCacheKey } from './cache';
import type { VoiceProvider } from '@shared/types';

const ELEVENLABS_TIMEOUT_MS = 2000; // Cost Saver Pack v6.0: fallback if >2s

interface TTSOptions {
  provider: VoiceProvider;
  language: Language;
  voiceMode?: VoiceMode;
}

/**
 * Cost Saver Pack v6.0: Multi-provider TTS with intelligent fallback
 * - Pro plan: Try ElevenLabs first, fallback to gTTS if error/timeout
 * - Free plan: Use gTTS directly (no ElevenLabs call)
 */
export async function generateSpeech(
  text: string,
  options: TTSOptions
): Promise<Buffer> {
  const { provider, language, voiceMode = 'pro' } = options;

  // Truncate text to save costs (Cost Saver Pack v6.0: max 200 chars)
  const truncatedText = text.length > 200 ? text.substring(0, 197) + '...' : text;

  // Check cache first (includes provider in key)
  const cacheKey = getTTSCacheKey(truncatedText, voiceMode, language, provider);
  const cached = ttsCache.get(cacheKey);
  if (cached && Buffer.isBuffer(cached)) {
    console.log(`[tts] cache hit (${provider}/${language}/${voiceMode})`);
    return cached;
  }

  try {
    let audioBuffer: Buffer;

    if (provider === 'elevenlabs') {
      // Pro plan: Try ElevenLabs with timeout + fallback
      try {
        console.log(`[tts] using ElevenLabs (${language}/${voiceMode})`);
        
        audioBuffer = await Promise.race([
          elevenLabsTTS(truncatedText, voiceMode, language),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('ElevenLabs timeout')), ELEVENLABS_TIMEOUT_MS)
          )
        ]);
        
        console.log(`[tts] ElevenLabs success, caching audio`);
      } catch (elevenLabsError) {
        // Fallback to gTTS if ElevenLabs fails or times out
        console.warn(`[tts] ElevenLabs failed/timeout, falling back to gTTS:`, elevenLabsError);
        audioBuffer = await generateGTTS(truncatedText, language);
        console.log(`[tts] gTTS fallback success`);
      }
    } else if (provider === 'gtts' || provider === 'piper') {
      // Free plan: Use gTTS directly
      console.log(`[tts] using gTTS (${language}) - Free plan`);
      audioBuffer = await generateGTTS(truncatedText, language);
    } else {
      throw new Error(`Unknown TTS provider: ${provider}`);
    }

    // Cache the result (with provider in key for isolation)
    ttsCache.set(cacheKey, audioBuffer);
    console.log(`[tts] cached audio for ${provider}/${language}/${voiceMode}`);

    return audioBuffer;
  } catch (error) {
    console.error(`[tts] All providers failed:`, error);
    throw new Error('Failed to generate speech');
  }
}

/**
 * Get available TTS provider based on plan mode
 */
export function getTTSProvider(planMode: 'pro' | 'free'): VoiceProvider {
  return planMode === 'pro' ? 'elevenlabs' : 'gtts';
}
